const BackupZip = (() => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const crcTable = new Uint32Array(256);
    for (let index = 0; index < crcTable.length; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        crcTable[index] = value >>> 0;
    }

    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }

    function concatBytes(chunks) {
        const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
        const result = new Uint8Array(length);
        let offset = 0;
        chunks.forEach((chunk) => {
            result.set(chunk, offset);
            offset += chunk.length;
        });
        return result;
    }

    function set16(view, offset, value) {
        view.setUint16(offset, value, true);
    }

    function set32(view, offset, value) {
        view.setUint32(offset, value, true);
    }

    function get16(view, offset) {
        return view.getUint16(offset, true);
    }

    function get32(view, offset) {
        return view.getUint32(offset, true);
    }

    function normalizePath(path) {
        if (typeof path !== 'string' || !path) {
            throw new Error('ZIP 备份中包含无效文件路径');
        }
        const normalized = path.replace(/\\/g, '/');
        const isDirectory = normalized.endsWith('/');
        const pathWithoutTrailingSlash = isDirectory ? normalized.slice(0, -1) : normalized;
        if (!pathWithoutTrailingSlash || pathWithoutTrailingSlash.startsWith('/')
            || /^[a-zA-Z]:/.test(pathWithoutTrailingSlash)
            || pathWithoutTrailingSlash.split('/').some((part) =>
                !part || part === '.' || part === '..')) {
            throw new Error(`ZIP 备份中包含无效文件路径：${path}`);
        }
        return { name: pathWithoutTrailingSlash, isDirectory };
    }

    function create(entries) {
        const localParts = [];
        const centralParts = [];
        let localOffset = 0;
        const dosDate = 0x21;

        if (entries.length > 0xffff) throw new Error('备份文件数量超出 ZIP 格式限制');
        entries.forEach(({ name, bytes }) => {
            const normalized = normalizePath(name);
            if (normalized.isDirectory) throw new Error('ZIP 备份文件名不能是目录');
            name = normalized.name;
            const nameBytes = encoder.encode(name);
            if (nameBytes.length > 0xffff || bytes.length > 0xffffffff || localOffset > 0xffffffff) {
                throw new Error('备份文件超出 ZIP 格式限制');
            }
            const checksum = crc32(bytes);
            const localHeader = new Uint8Array(30 + nameBytes.length);
            const localView = new DataView(localHeader.buffer);
            set32(localView, 0, 0x04034b50);
            set16(localView, 4, 20);
            set16(localView, 6, 0x0800);
            set16(localView, 8, 0);
            set16(localView, 10, 0);
            set16(localView, 12, dosDate);
            set32(localView, 14, checksum);
            set32(localView, 18, bytes.length);
            set32(localView, 22, bytes.length);
            set16(localView, 26, nameBytes.length);
            set16(localView, 28, 0);
            localHeader.set(nameBytes, 30);
            localParts.push(localHeader, bytes);

            const centralHeader = new Uint8Array(46 + nameBytes.length);
            const centralView = new DataView(centralHeader.buffer);
            set32(centralView, 0, 0x02014b50);
            set16(centralView, 4, 20);
            set16(centralView, 6, 20);
            set16(centralView, 8, 0x0800);
            set16(centralView, 10, 0);
            set16(centralView, 12, 0);
            set16(centralView, 14, dosDate);
            set32(centralView, 16, checksum);
            set32(centralView, 20, bytes.length);
            set32(centralView, 24, bytes.length);
            set16(centralView, 28, nameBytes.length);
            set16(centralView, 30, 0);
            set16(centralView, 32, 0);
            set16(centralView, 34, 0);
            set16(centralView, 36, 0);
            set32(centralView, 38, 0);
            set32(centralView, 42, localOffset);
            centralHeader.set(nameBytes, 46);
            centralParts.push(centralHeader);
            localOffset += localHeader.length + bytes.length;
        });

        const centralDirectory = concatBytes(centralParts);
        if (localOffset + centralDirectory.length + 22 > 0xffffffff) {
            throw new Error('备份文件超出 ZIP 格式限制');
        }
        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        set32(endView, 0, 0x06054b50);
        set16(endView, 4, 0);
        set16(endView, 6, 0);
        set16(endView, 8, entries.length);
        set16(endView, 10, entries.length);
        set32(endView, 12, centralDirectory.length);
        set32(endView, 16, localOffset);
        set16(endView, 20, 0);
        return new Blob([...localParts, centralDirectory, endRecord], { type: 'application/zip' });
    }

    async function inflateRaw(bytes) {
        if (typeof DecompressionStream !== 'function') {
            throw new Error('当前浏览器不支持读取压缩 ZIP 备份');
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function read(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const minimumEndOffset = Math.max(0, bytes.length - 0xffff - 22);
        let endOffset = -1;
        for (let offset = bytes.length - 22; offset >= minimumEndOffset; offset -= 1) {
            if (get32(view, offset) === 0x06054b50
                && offset + 22 + get16(view, offset + 20) === bytes.length) {
                endOffset = offset;
                break;
            }
        }
        if (endOffset < 0) throw new Error('ZIP 备份结构不完整');
        const disk = get16(view, endOffset + 4);
        const centralDisk = get16(view, endOffset + 6);
        const diskEntries = get16(view, endOffset + 8);
        const entryCount = get16(view, endOffset + 10);
        const centralSize = get32(view, endOffset + 12);
        const centralOffset = get32(view, endOffset + 16);
        if (disk || centralDisk || diskEntries !== entryCount
            || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff
            || centralOffset + centralSize !== endOffset) {
            throw new Error('不支持分卷或 ZIP64 备份');
        }

        const entries = new Map();
        const names = new Set();
        const centralEntries = [];
        let cursor = centralOffset;
        for (let index = 0; index < entryCount; index += 1) {
            if (cursor + 46 > endOffset || get32(view, cursor) !== 0x02014b50) {
                throw new Error('ZIP 备份目录损坏');
            }
            const flags = get16(view, cursor + 8);
            const method = get16(view, cursor + 10);
            const checksum = get32(view, cursor + 16);
            const compressedSize = get32(view, cursor + 20);
            const uncompressedSize = get32(view, cursor + 24);
            const nameLength = get16(view, cursor + 28);
            const extraLength = get16(view, cursor + 30);
            const commentLength = get16(view, cursor + 32);
            const entryDisk = get16(view, cursor + 34);
            const localOffset = get32(view, cursor + 42);
            const recordLength = 46 + nameLength + extraLength + commentLength;
            if (cursor + recordLength > endOffset || entryDisk || localOffset === 0xffffffff
                || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
                throw new Error('ZIP 备份目录项无效');
            }
            if ((flags & 1) || (method !== 0 && method !== 8)) {
                throw new Error('ZIP 备份使用了不支持的加密或压缩方式');
            }
            const nameStart = cursor + 46;
            const rawName = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
            const { name, isDirectory } = normalizePath(rawName);
            if (names.has(name)) throw new Error('ZIP 备份中存在重复文件');
            names.add(name);
            if (localOffset + 30 > centralOffset || get32(view, localOffset) !== 0x04034b50) {
                throw new Error('ZIP 备份文件内容不完整');
            }
            const localFlags = get16(view, localOffset + 6);
            const localMethod = get16(view, localOffset + 8);
            const localNameLength = get16(view, localOffset + 26);
            const localExtraLength = get16(view, localOffset + 28);
            if ((localFlags & 1) || localMethod !== method || localFlags !== flags) {
                throw new Error('ZIP 备份头信息不一致');
            }
            const localNameStart = localOffset + 30;
            if (localNameStart + localNameLength + localExtraLength > centralOffset) {
                throw new Error('ZIP 备份文件头被截断');
            }
            const rawLocalName = decoder.decode(bytes.subarray(localNameStart, localNameStart + localNameLength));
            const normalizedLocalName = normalizePath(rawLocalName);
            if (normalizedLocalName.name !== name || normalizedLocalName.isDirectory !== isDirectory) {
                throw new Error('ZIP 备份文件名与目录不一致');
            }
            const dataStart = localNameStart + localNameLength + localExtraLength;
            const dataEnd = dataStart + compressedSize;
            if (dataEnd > centralOffset) throw new Error('ZIP 备份文件数据被截断');
            centralEntries.push({ name, isDirectory, method, checksum, compressedSize, uncompressedSize, dataStart, dataEnd });
            cursor += recordLength;
        }
        if (cursor !== endOffset) throw new Error('ZIP 备份目录长度不一致');

        for (const entry of centralEntries) {
            const compressed = bytes.subarray(entry.dataStart, entry.dataEnd);
            const content = entry.method === 0 ? compressed : await inflateRaw(compressed);
            if (content.length !== entry.uncompressedSize || crc32(content) !== entry.checksum) {
                throw new Error(`ZIP 备份文件校验失败：${entry.name}`);
            }
            if (entry.isDirectory) {
                if (content.length !== 0) throw new Error(`ZIP 备份目录项包含文件内容：${entry.name}`);
                continue;
            }
            if (entries.has(entry.name)) throw new Error('ZIP 备份中存在重复文件');
            entries.set(entry.name, content);
        }
        return entries;
    }

    return { crc32, create, read };
})();
