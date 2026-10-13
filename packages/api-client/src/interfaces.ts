import {
  PublicProfile,
  PrivateUserProfile,
  PerspectiveRequest,
  CreateRequestInput,
  PerspectiveResponse,
  SubmitResponseInput,
  SubmitFeedbackInput,
  Connection,
  ChatMessage,
  SendMessageInput,
  ExploreBatch,
  SkipRequestInput,
  CreateReportInput,
  BlockUserInput,
  DeleteAccountInput,
} from '@perspective/contracts';

export interface PerspectiveApiClient {
  // User & Auth
  getMe(): Promise<PrivateUserProfile>;
  updateProfile(updates: Partial<PublicProfile>): Promise<PublicProfile>;
  
  // Explore
  getExploreBatch(): Promise<ExploreBatch>;
  skipRequest(input: SkipRequestInput): Promise<{ success: boolean }>;
  
  // Requests
  getMyRequests(): Promise<PerspectiveRequest[]>;
  createRequest(input: CreateRequestInput): Promise<PerspectiveRequest>;
  
  // Responses
  submitResponse(input: SubmitResponseInput): Promise<PerspectiveResponse>;
  getInbox(): Promise<PerspectiveResponse[]>;
  submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean; connectionCreated?: Connection }>;
  
  // Connections & Chat
  getConnections(): Promise<Connection[]>;
  getMessages(connectionId: string): Promise<ChatMessage[]>;
  sendMessage(input: SendMessageInput): Promise<ChatMessage>;
  
  // Safety
  report(input: CreateReportInput): Promise<{ reportId: string }>;
  blockUser(input: BlockUserInput): Promise<{ success: boolean }>;
  deleteAccount(input: DeleteAccountInput): Promise<{ success: boolean }>;
}
