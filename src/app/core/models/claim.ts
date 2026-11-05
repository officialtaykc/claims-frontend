export type DemoRole = 'claimant' | 'officer' | 'manager';
export type ClaimType = 'MOTOR' | 'PROPERTY';
export type ClaimStatus =
  | 'NEW'
  | 'IN_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'PENDING_DECISION'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'CLOSED';

export interface ClaimFormOptions {
  claimTypes: string[];
  markets: string[];
  currencies: string[];
  claimCategories: string[];
  propertyTypes: string[];
  causesOfLoss: string[];
  affectedAreas: string[];
}

export interface MotorClaimFormOptions {
  claimTypes: string[];
  markets: string[];
  currencies: string[];
  claimCategories: string[];
}

export interface PropertyClaimFormOptions {
  claimTypes: string[];
  markets: string[];
  currencies: string[];
  propertyTypes: string[];
  causesOfLoss: string[];
  affectedAreas: string[];
}

export interface MotorClaimDetailsRequest {
  vehicleRegistration: string;
  vehicleModel: string;
  driverName: string;
  driverLicenceNumber: string;
  thirdPartyInvolved: boolean;
  policeReportNumber: string;
  claimCategory: string;
}

export interface PropertyClaimDetailsRequest {
  propertyType: string;
  propertyAddress: string;
  affectedAreas: string;
  damageToBuilding: boolean;
  damageToContents: boolean;
  causeOfLoss: string;
  estimatedRepairCost: number;
  estimatedContentsLoss: number;
}

export interface DemoUser {
  name: string;
  email: string;
  role: DemoRole;
}

export interface LoginRequest {
  role: 'CLAIMANT' | 'OFFICER' | 'MANAGER';
  identifier: string;
  password: string;
}

export interface LoginResponse {
  name: string;
  email: string;
  role: DemoRole;
}

export interface ClaimantPolicy {
  id: string;
  policyNumber: string;
  claimType: ClaimType;
  productName: string;
  market: string;
  currency: string;
  insuredItem: string | null;
  coverageAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string | null;
}

export interface Claim {
  id: string;
  claimReference: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string | null;
  market: string;
  claimType: ClaimType;
  policyNumber: string;
  incidentDate: string;
  incidentLocation?: string | null;
  incidentCategory?: string | null;
  incidentDescription: string;
  assetReference?: string | null;
  estimatedLoss: number;
  currency: string;
  status: ClaimStatus;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: string | null;
  decisionAmount?: number | null;
  decisionReason?: string | null;
  decisionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  informationRequests: InformationRequest[];
  documents: ClaimDocument[];
}

export interface ClaimSubmissionRequest {
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  market: string;
  claimType: ClaimType;
  policyNumber: string;
  incidentDate: string;
  incidentLocation: string;
  incidentCategory: string;
  incidentDescription: string;
  assetReference: string;
  estimatedLoss: number;
  currency: string;
  motorDetails?: MotorClaimDetailsRequest;
  propertyDetails?: PropertyClaimDetailsRequest;
}

export interface ClaimSubmissionResponse {
  claimReference: string;
  eventId: string;
  status: ClaimStatus;
  message: string;
}

export interface ClaimHistory {
  previousStatus: ClaimStatus | null;
  newStatus: ClaimStatus;
  changedBy: string;
  comment: string | null;
  changedAt: string;
}

export interface InformationRequest {
  id: string;
  requestMessage: string;
  requestedBy: string;
  dueDate: string;
  requestStatus: 'OPEN' | 'RESPONDED';
  responseMessage?: string | null;
  requestedAt: string;
  respondedAt?: string | null;
}

export interface ClaimDocument {
  id: string;
  fileName: string;
  contentType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DashboardSummary {
  totalClaims: number;
  newClaims: number;
  inReview: number;
  additionalInfoRequired: number;
  pendingDecision: number;
  approved: number;
  rejected: number;
  settled: number;
  overdueInfoRequests: number;
  estimatedOutstandingExposure: number;
  approvedExposure: number;
  claimsByMarket: Record<string, number>;
  claimsByType: Record<string, number>;
}

export interface OfficerWorkload {
  officerName: string;
  totalClaims: number;
  newClaims: number;
  inReview: number;
  additionalInfoRequired: number;
  pendingDecision: number;
  approved: number;
  rejected: number;
  settledOrClosed: number;
}

export interface WorkloadResponse {
  officers: OfficerWorkload[];
}

export interface ClaimFilters {
  status?: ClaimStatus;
  claimType?: ClaimType;
  market?: string;
  assignedTo?: string;
}
