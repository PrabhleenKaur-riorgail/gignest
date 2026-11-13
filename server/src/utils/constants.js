export const CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Design',
  'Writing',
  'Data & AI',
  'Marketing',
  'Video & Audio',
  'Business',
  'Other',
];

export const PROJECT_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
};

export const BID_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

export const CONTRACT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const MILESTONE_STATUS = {
  PENDING: 'PENDING', // waiting for the client to fund it
  FUNDED: 'FUNDED', // client has paid, freelancer can start
  SUBMITTED: 'SUBMITTED', // freelancer delivered work
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  APPROVED: 'APPROVED', // client accepted the work
  RELEASED: 'RELEASED', // money released to the freelancer
};

// Percentage the platform keeps from each released milestone (can be set in .env).
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 5;

export const TRANSACTION_TYPE = {
  FUND: 'FUND', // client pays money into escrow for a milestone
  RELEASE: 'RELEASE', // escrow money goes to the freelancer (minus platform fee)
};

export const PAYMENT_STATUS = {
  CREATED: 'CREATED', // order made, waiting for payment
  PAID: 'PAID',
  FAILED: 'FAILED',
};

export const NOTIFICATION_TYPE = {
  NEW_BID: 'NEW_BID',
  BID_ACCEPTED: 'BID_ACCEPTED',
  BID_REJECTED: 'BID_REJECTED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  MILESTONE_FUNDED: 'MILESTONE_FUNDED',
  WORK_SUBMITTED: 'WORK_SUBMITTED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  PAYMENT_RELEASED: 'PAYMENT_RELEASED',
  CONTRACT_COMPLETED: 'CONTRACT_COMPLETED',
};
