import { storage, type WxtStorageItem } from 'wxt/storage';
import { useEffect, useState } from 'react';

export interface Config {
    comment: string;
    autoSubmit: boolean;
    delay: number;
    startDate: string;
    timeJson: string;
}

export interface Credentials {
    username: string;
    password?: string;
}

export const DEFAULT_CONFIG: Config = {
    comment: "老师教学认真，课堂气氛活跃，收获很大！",
    autoSubmit: false,
    delay: 500,
    startDate: "",
    timeJson: ""
};

export const DEFAULT_CREDENTIALS: Credentials = {
    username: "",
    password: ""
};

export const configItem = storage.defineItem<Config>('local:config', {
    defaultValue: DEFAULT_CONFIG,
});

export const credentialsItem = storage.defineItem<Credentials>('local:credentials', {
    defaultValue: DEFAULT_CREDENTIALS,
});

function useWxtStorage<T>(item: WxtStorageItem<T, Record<string, unknown>>): [T | null, (val: T) => Promise<void>] {
    const [value, setValue] = useState<T | null>(null);

    useEffect(() => {
        item.getValue().then(setValue);
        const unwatch = item.watch(setValue);
        return () => unwatch();
    }, [item]);

    const setStorageValue = async (val: T) => {
        await item.setValue(val);
        setValue(val);
    };

    return [value, setStorageValue];
}

export const useConfig = () => useWxtStorage<Config>(configItem);
export const useCredentials = () => useWxtStorage<Credentials>(credentialsItem);
