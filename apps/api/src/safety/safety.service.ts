import { Injectable } from '@nestjs/common';
import { InMemoryPerspectiveClient } from '@perspective/api-client';
import {
  CreateReportInput,
  BlockUserInput,
  DeleteAccountInput,
} from '@perspective/contracts';

@Injectable()
export class SafetyService {
  private client = new InMemoryPerspectiveClient();

  async report(userId: string, input: CreateReportInput) {
    return this.client.report(input);
  }

  async block(userId: string, input: BlockUserInput) {
    return this.client.blockUser(input);
  }

  async deleteAccount(userId: string, input: DeleteAccountInput) {
    return this.client.deleteAccount(input);
  }
}
