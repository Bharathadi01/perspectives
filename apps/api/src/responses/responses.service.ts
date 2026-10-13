import { Injectable } from '@nestjs/common';
import { InMemoryPerspectiveClient } from '@perspective/api-client';
import {
  SubmitResponseInput,
  SubmitFeedbackInput,
  PerspectiveResponse,
} from '@perspective/contracts';

@Injectable()
export class ResponsesService {
  private client = new InMemoryPerspectiveClient();

  async submit(userId: string, input: SubmitResponseInput): Promise<PerspectiveResponse> {
    return this.client.submitResponse(input);
  }

  async getInbox(userId: string): Promise<PerspectiveResponse[]> {
    return this.client.getInbox();
  }

  async submitFeedback(userId: string, input: SubmitFeedbackInput) {
    return this.client.submitFeedback(input);
  }
}
