import { Button } from './button';

export interface Message {
    text: string;
    username: string;
    timestamp: number;
    dateString?: string;
    timeString?: string;
    buttons?: Button[];
}
