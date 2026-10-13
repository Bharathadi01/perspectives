import {
  PerspectiveApiClient,
} from './interfaces';
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
import {
  mockCurrentUser,
  mockRequests,
  mockResponses,
  mockConnections,
  mockMessages,
  mockProfiles,
} from './fixtures';

export class InMemoryPerspectiveClient implements PerspectiveApiClient {
  private user: PrivateUserProfile = { ...mockCurrentUser };
  private requests: PerspectiveRequest[] = [...mockRequests];
  private responses: PerspectiveResponse[] = [...mockResponses];
  private connections: Connection[] = [...mockConnections];
  private messages: Record<string, ChatMessage[]> = { ...mockMessages };
  private skippedRequestIds: Set<string> = new Set();
  private blockedUserIds: Set<string> = new Set();
  private reports: CreateReportInput[] = [];

  async getMe(): Promise<PrivateUserProfile> {
    return { ...this.user };
  }

  async updateProfile(updates: Partial<PublicProfile>): Promise<PublicProfile> {
    this.user.publicProfile = {
      ...this.user.publicProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.user.publicProfile };
  }

  async getExploreBatch(): Promise<ExploreBatch> {
    const eligible = this.requests.filter(
      (r) =>
        r.status === 'active' &&
        r.authorId !== this.user.userId &&
        !this.skippedRequestIds.has(r.id) &&
        !this.blockedUserIds.has(r.authorId)
    );

    return {
      requests: eligible,
      impressionToken: `imp_tok_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      dailyBatchCount: eligible.length,
      dailyBatchTotal: 8,
      dailyHeadline: `${eligible.length} thoughtful requests today`,
    };
  }

  async skipRequest(input: SkipRequestInput): Promise<{ success: boolean }> {
    this.skippedRequestIds.add(input.requestId);
    return { success: true };
  }

  async getMyRequests(): Promise<PerspectiveRequest[]> {
    return this.requests.filter((r) => r.authorId === this.user.userId);
  }

  async createRequest(input: CreateRequestInput): Promise<PerspectiveRequest> {
    const newRequest: PerspectiveRequest = {
      id: `req_${Date.now()}`,
      authorId: this.user.userId,
      author: this.user.publicProfile,
      category: input.category,
      question: input.question,
      context: input.context,
      responseStyle: input.responseStyle,
      media: input.media || [],
      audience: input.audience || { languages: ['en'], lensesAny: [], cityIds: [] },
      allowsConnection: input.allowsConnection,
      allowedConnectionModes: input.allowedConnectionModes,
      status: 'active', // Auto-moderated to active in local test environment
      moderationState: 'allowed',
      responseCount: 0,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    };
    this.requests.unshift(newRequest);
    return newRequest;
  }

  async submitResponse(input: SubmitResponseInput): Promise<PerspectiveResponse> {
    const targetRequest = this.requests.find((r) => r.id === input.requestId);
    const newResponse: PerspectiveResponse = {
      id: `resp_${Date.now()}`,
      requestId: input.requestId,
      request: targetRequest,
      authorId: this.user.userId,
      author: this.user.publicProfile,
      firstImpression: input.firstImpression,
      reason: input.reason,
      suggestion: input.suggestion,
      tags: input.tags,
      tone: input.tone,
      connectionIntent: input.connectionIntent,
      status: 'delivered',
      moderationState: 'allowed',
      createdAt: new Date().toISOString(),
    };

    if (targetRequest) {
      targetRequest.responseCount += 1;
    }

    // In a two-party simulation, if this is our response to another person's request,
    // mark that we skipped/completed it from our explore feed
    this.skippedRequestIds.add(input.requestId);
    this.responses.unshift(newResponse);

    return newResponse;
  }

  async getInbox(): Promise<PerspectiveResponse[]> {
    return this.responses.filter(
      (r) =>
        r.status !== 'removed' &&
        !this.blockedUserIds.has(r.authorId)
    );
  }

  async submitFeedback(
    input: SubmitFeedbackInput
  ): Promise<{ success: boolean; connectionCreated?: Connection }> {
    const response = this.responses.find((r) => r.id === input.responseId);
    if (!response) {
      throw new Error('Response not found');
    }

    if (input.rating === 'helpful') {
      response.status = 'helpful';
    } else {
      response.status = 'archived';
    }

    let connectionCreated: Connection | undefined;

    // Mutuality check for connection
    if (
      input.connectionIntent &&
      response.connectionIntent &&
      input.connectionIntent === response.connectionIntent
    ) {
      const partnerProfile = response.author || mockProfiles[response.authorId] || {
        id: response.authorId,
        displayName: 'Partner',
        languages: ['en'],
        bio: 'Perspective collaborator',
        photoUrls: [],
        prompts: [],
        lenses: [],
        connectionModes: [input.connectionIntent],
        verification: { contact: true, selfie: false },
        helpfulnessTier: 'trusted',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newConnection: Connection = {
        id: `conn_${Date.now()}`,
        partner: partnerProfile,
        status: 'active',
        mode: input.connectionIntent,
        origin: {
          requestId: response.requestId,
          requestQuestion: response.request?.question || 'Perspective Request',
          responseId: response.id,
          responseFirstImpression: response.firstImpression,
          responseReason: response.reason,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.connections.unshift(newConnection);
      this.messages[newConnection.id] = [
        {
          id: `msg_sys_${Date.now()}`,
          connectionId: newConnection.id,
          senderId: 'system',
          text: `You connected through mutual interest in "${input.connectionIntent}". Say hello!`,
          createdAt: new Date().toISOString(),
        },
      ];
      connectionCreated = newConnection;
    }

    return { success: true, connectionCreated };
  }

  async getConnections(): Promise<Connection[]> {
    return this.connections.filter(
      (c) => !this.blockedUserIds.has(c.partner.id)
    );
  }

  async getMessages(connectionId: string): Promise<ChatMessage[]> {
    return this.messages[connectionId] || [];
  }

  async sendMessage(input: SendMessageInput): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      connectionId: input.connectionId,
      senderId: this.user.userId,
      text: input.text,
      createdAt: new Date().toISOString(),
    };

    if (!this.messages[input.connectionId]) {
      this.messages[input.connectionId] = [];
    }
    this.messages[input.connectionId].push(newMessage);

    return newMessage;
  }

  async report(input: CreateReportInput): Promise<{ reportId: string }> {
    this.reports.push(input);
    return { reportId: `rep_${Date.now()}` };
  }

  async blockUser(input: BlockUserInput): Promise<{ success: boolean }> {
    this.blockedUserIds.add(input.blockedUserId);
    // Bidirectional exclusion: remove connection if existing
    this.connections = this.connections.filter(
      (c) => c.partner.id !== input.blockedUserId
    );
    return { success: true };
  }

  async deleteAccount(input: DeleteAccountInput): Promise<{ success: boolean }> {
    if (input.confirmationPhrase !== 'DELETE MY ACCOUNT') {
      throw new Error('Confirmation phrase mismatch');
    }
    this.user.publicProfile.status = 'deleted';
    this.requests = [];
    this.responses = [];
    this.connections = [];
    return { success: true };
  }
}
