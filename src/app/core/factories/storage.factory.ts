import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { StorageBackend } from '@openid/appauth';
import 'capacitor-secure-storage-plugin';
import { Plugins } from '@capacitor/core';

const { SecureStoragePlugin } = Plugins;


class StorageService implements StorageBackend {
    storage: Storage = null;

    constructor() {
        this.storage = new Storage({storeName: 'localstorage'});
    }

    getItem(name: string): Promise<string> {
        return this.storage.get(name);
    }

    removeItem(name: string): Promise<void> {
        return this.storage.remove(name);
    }

    clear(): Promise<void> {
        return this.storage.clear();
    }

    setItem(name: string, value: string): Promise<void> {
        return this.storage.set(name, value);
    }
}

class CapacitorSecureStorage implements StorageBackend {

    constructor() {
    }

    getItem(key: string): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            SecureStoragePlugin.get({key}).then(
                (value) => {
                    resolve(value.value);
                },
                () => {
                    resolve(null);
                });
        });
    }

    removeItem(key: string): Promise<void> {
        return SecureStoragePlugin.remove({key});
    }

    clear(): Promise<void> {
        return SecureStoragePlugin.clear();
    }

    setItem(key: string, value: string): Promise<void> {
        return SecureStoragePlugin.set({key, value});
    }
}


export let storageFactory = (platform: Platform) => {
    return platform.is('capacitor') ? new CapacitorSecureStorage() : new StorageService();
};
