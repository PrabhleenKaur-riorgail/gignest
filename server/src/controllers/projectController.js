import Project from '../models/Project.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { CATEGORIES, PROJECT_STATUS } from '../utils/constants.js';
import { str, escapeRegex, normalizeSkills, parsePagination } from '../utils/validators.js';

const CLIENT_FIELDS = 'name avatar company ratingAverage ratingCount';

// Validates the project form. For a new project every field is required.
// For an update (existing is given) only the fields that were sent are checked.
const cleanProjectInput = (body, existing = null) => {
  const out = {};
  const needAll = !existing;
  const has = (key) => body[key] !== undefined;

  if (needAll || has('title')) {
    if (typeof body.title !== 'string' || body.title.trim().length < 5 || body.title.trim().length > 120) {
      throw new AppError('Title must be 5 to 120 characters', 400);
    }
    out.title = body.title.trim();
  }

  if (needAll || has('description')) {
    if (typeof body.description !== 'string' || body.description.trim().length < 20 || body.description.trim().length > 5000) {
      throw new AppError('Description must be 20 to 5000 characters', 400);
    }
    out.description = body.description.trim();
  }

  if (needAll || has('category')) {
    if (!CATEGORIES.includes(body.category)) {
      throw new AppError('Please choose a valid category', 400);
    }
    out.category = body.category;
  }

  if (needAll || has('skills')) {
    out.skills = normalizeSkills(body.skills, { max: 15, min: 1 });
  }

  if (needAll || has('budgetMin')) {
    if (typeof body.budgetMin !== 'number' || !Number.isFinite(body.budgetMin) || body.budgetMin < 0) {
      throw new AppError('Minimum budget must be a number, 0 or more', 400);
    }
    out.budgetMin = body.budgetMin;
  }
  if (needAll || has('budgetMax')) {
    if (typeof body.budgetMax !== 'number' || !Number.isFinite(body.budgetMax) || body.budgetMax < 0) {
      throw new AppError('Maximum budget must be a number, 0 or more', 400);
    }
    out.budgetMax = body.budgetMax;
  }
  const min = out.budgetMin ?? existing?.budgetMin;
  const max = out.budgetMax ?? existing?.budgetMax;
  if (max < min) throw new AppError('Maximum budget cannot be less than minimum budget', 400);

  if (needAll || has('deadline')) {
    const d = new Date(body.deadline);
    if (typeof body.deadline !== 'string' || Number.isNaN(d.getTime())) {
      throw new AppError('Please enter a valid deadline date', 400);
    }
    if (d.getTime() <= Date.now()) {
      throw new AppError('Deadline must be a future date', 400);
    }
    out.deadline = d;
  }

  return out;
};

// Loads a project and checks that the logged-in user owns it.
const getOwnedProject = async (req) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  if (!project.client.equals(req.user._id)) {
    throw new AppError('You can only change your own projects', 403);
  }
  return project;
};

// GET /api/projects/categories
export const getCategories = (req, res) => {
  res.json({ categories: CATEGORIES });
};

// POST /api/projects  (client only)
export const createProject = asyncHandler(async (req, res) => {
  const fields = cleanProjectInput(req.body);
  const project = await Project.create({ ...fields, client: req.user._id });
  await project.populate('client', CLIENT_FIELDS);
  res.status(201).json({ project });
});

// GET /api/projects  - browse OPEN projects with search, filters, sort and pagination
export const listProjects = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { status: PROJECT_STATUS.OPEN };

  const search = str(q.q)?.trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { skills: rx }];
  }

  const category = str(q.category);
  if (category) {
    if (!CATEGORIES.includes(category)) throw new AppError('Unknown category', 400);
    filter.category = category;
  }

  const skillsParam = str(q.skills);
  if (skillsParam) {
    const list = skillsParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (list.length) filter.skills = { $in: list };
  }

  const minBudget = str(q.minBudget);
  if (minBudget !== undefined && minBudget !== '') {
    const n = Number(minBudget);
    if (Number.isNaN(n)) throw new AppError('minBudget must be a number', 400);
    filter.budgetMax = { $gte: n }; // project can pay at least this much
  }
  const maxBudget = str(q.maxBudget);
  if (maxBudget !== undefined && maxBudget !== '') {
    const n = Number(maxBudget);
    if (Number.isNaN(n)) throw new AppError('maxBudget must be a number', 400);
    filter.budgetMin = { $lte: n }; // project starts at or below this amount
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    budget_high: { budgetMax: -1 },
    budget_low: { budgetMin: 1 },
    deadline: { deadline: 1 },
  };
  const sort = sortOptions[str(q.sort)] || sortOptions.newest;

  const { page, limit, skip } = parsePagination(q);

  const [projects, total] = await Promise.all([
    Project.find(filter).sort(sort).skip(skip).limit(limit).populate('client', CLIENT_FIELDS),
    Project.countDocuments(filter),
  ]);

  res.json({ projects, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/projects/mine  (client only) - my own projects, any status
export const listMyProjects = asyncHandler(async (req, res) => {
  const filter = { client: req.user._id };
  const status = str(req.query.status);
  if (status) {
    if (!Object.values(PROJECT_STATUS).includes(status)) throw new AppError('Unknown status', 400);
    filter.status = status;
  }
  const { page, limit, skip } = parsePagination(req.query);

  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);

  res.json({ projects, page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('client', CLIENT_FIELDS);
  if (!project) throw new AppError('Project not found', 404);
  res.json({ project });
});

// PUT /api/projects/:id  (owner only, only while OPEN)
export const updateProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req);
  if (project.status !== PROJECT_STATUS.OPEN) {
    throw new AppError('Only open projects can be edited', 400);
  }
  const fields = cleanProjectInput(req.body, project);
  Object.assign(project, fields);
  await project.save();
  await project.populate('client', CLIENT_FIELDS);
  res.json({ project });
});

// PATCH /api/projects/:id/close  (owner only, only while OPEN)
export const closeProject = asyncHandler(async (req, res) => {
  const project = await getOwnedProject(req);
  if (project.status !== PROJECT_STATUS.OPEN) {
    throw new AppError('Only open projects can be closed', 400);
  }
  project.status = PROJECT_STATUS.CLOSED;
  await project.save();
  res.json({ project });
});

// DELETE /api/projects/:id  (owner or admin, only OPEN or CLOSED)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);

  const isOwner = project.client.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own projects', 403);
  }
  if (![PROJECT_STATUS.OPEN, PROJECT_STATUS.CLOSED].includes(project.status)) {
    throw new AppError('Projects that are in progress or completed cannot be deleted', 400);
  }

  await project.deleteOne();
  res.json({ message: 'Project deleted' });
});
