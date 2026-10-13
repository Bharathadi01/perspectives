import { Injectable } from '@nestjs/common';
import { InMemoryPerspectiveClient } from '@perspective/api-client';
import { Connection, ChatMessage, SendMessageInput } from '@perspective/contracts';

@Injectable()
export class ConnectionsService {
  private client = new InMemoryPerspectiveClient();

  async getConnections(userId: string): Promise<Connection[]> {
    return this.client.getConnections();
  }

  async getMessages(userId: string, connectionId: string): Promise<ChatMessage[]> {
    return this.client.getMessages(connectionId);
  }

  async sendMessage(userId: string, input: SendMessageInput): Promise<ChatMessage> {
    return this.client.sendMessage(input);
  }
}
