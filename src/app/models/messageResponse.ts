import { Message } from './message';

export interface MessageResponse {
    messages: Message[];
    config?: any;
}
