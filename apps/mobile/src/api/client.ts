import { InMemoryPerspectiveClient, PerspectiveApiClient } from '@perspective/api-client';

// In v1 development / independent mobile testing, the client runs against the
// production-parity in-memory adapter seeded with authentic fixtures.
export const apiClient: PerspectiveApiClient = new InMemoryPerspectiveClient();
