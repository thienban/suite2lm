const API_URL = 'http://localhost:8080/api';

export interface FileInfo {
    name: string;
    path: string;
}

export async function getFiles(): Promise<FileInfo[]> {
    const res = await fetch(`${API_URL}/files`);
    if (!res.ok) {
        throw new Error('Failed to fetch files');
    }
    return res.json();
}

export async function getFileContent(name: string): Promise<string> {
    const res = await fetch(`${API_URL}/files/${name}`);
    if (!res.ok) {
        throw new Error('Failed to fetch file content');
    }
    return res.text();
}

export async function saveFileContent(name: string, content: string): Promise<void> {
    const res = await fetch(`${API_URL}/files/${name}`, {
        method: 'POST',
        body: content,
    });
    if (!res.ok) {
        throw new Error('Failed to save file');
    }
}
