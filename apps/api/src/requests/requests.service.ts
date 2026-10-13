import { Injectable } from '@nestjs/common';
import { InMemoryPerspectiveClient } from '@perspective/api-client';
import { CreateRequestInput, PerspectiveRequest } from '@perspective/contracts';

@Injectable()
export class RequestsService {
  private client = new InMemoryPerspectiveClient();

  async create(userId: string, input: CreateRequestInput): Promise<PerspectiveRequest> {
    return this.client.createRequest(input);
  }

  async getMyRequests(userId: string): Promise<PerspectiveRequest[]> {
    return this.client.getMyRequests();
  }
}
