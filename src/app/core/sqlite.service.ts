import { Injectable } from '@angular/core';

import { Plugins } from '@capacitor/core';
import { Message } from '../models/message';

const {CapacitorSQLite, Device} = Plugins;
import '@capacitor-community/sqlite';
import { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';


@Injectable({
    providedIn: 'root'
})
export class SQLiteService {
    readonly database = 'goalsetting';

    readonly queryCreate = `
        CREATE TABLE IF NOT EXISTS messages (
            timestamp INTEGER PRIMARY KEY NOT NULL,
            text TEXT,
            username TEXT,
            dateString TEXT,
            timeString TEXT
        );
        PRAGMA user_version = 1;`;
    readonly queryInsert = `
        INSERT OR IGNORE INTO messages
        (timestamp, text, username, dateString, timeString)
        VALUES (?, ?, ?, ?, ?);`;
    readonly querySelect = `
        SELECT timestamp, text, username, dateString, timeString
        FROM messages ORDER BY timestamp;`;
    readonly queryLast = `SELECT MAX(timestamp) as lastCall FROM messages;`;
    readonly queryCount = `SELECT COUNT(*) FROM messages;`;

    sqlite: SQLiteConnection;
    isService = false;
    platform: string;

    constructor() {
    }

    /**
     * Plugin Initialization
     */
    async initializePlugin(): Promise<void> {
        const info = await Device.getInfo();
        this.platform = info.platform;
        if (this.platform === 'ios' || this.platform === 'android') {
            this.sqlite = new SQLiteConnection(CapacitorSQLite);
            this.isService = true;
        }
    }

    async getConnection(): Promise<SQLiteDBConnection> {
        let db: SQLiteDBConnection;

        if ((await this.sqlite.isConnection(this.database)).result) {
            db = await this.sqlite.retrieveConnection(this.database);
        } else {
            db = await this.sqlite.createConnection(this.database, false, 'no-encryption', 1);
            await db.open();
            await db.execute(this.queryCreate);
        }
        return db;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Custom methods for Goalsetting
    ///////////////////////////////////////////////////////////////////////////
    async insertMessagesDB(message: Message): Promise<any> {
        if (this.isService) {
            const values: any[] = [
                message.timestamp,
                message.text,
                message.username,
                message.dateString || '',
                message.timeString || ''
            ];
            const db = await this.getConnection();
            return db.run(this.queryInsert, values);
        } else {
            return Promise.resolve({changes: -1, message: 'Service not started'});
        }
    }

    async selectMessagesDB(): Promise<any> {
        if (this.isService) {
            const db = await this.getConnection();
            return db.query(this.querySelect);
        } else {
            return Promise.resolve({values: [], message: 'Service not started'});
        }
    }

    async lastMessageDB(): Promise<any> {
        if (this.isService) {
            const db = await this.getConnection();
            return db.query(this.queryLast);
        } else {
            return Promise.resolve({values: [], message: 'Service not started'});
        }
    }

    async countMessageDB(): Promise<any> {
        if (this.isService) {
            const db = await this.getConnection();
            return db.query(this.queryCount);
        } else {
            return Promise.resolve({values: [], message: 'Service not started'});
        }
    }
}
