(function () {
    const TIMEOUT_MS = 15000;
    async function load(url, options = {}, onProgress) {
        const controller = new AbortController();
        const callerSignal = options.signal;
        const forwardAbort = () => controller.abort(callerSignal?.reason);
        if (callerSignal?.aborted)
            forwardAbort();
        else
            callerSignal?.addEventListener('abort', forwardAbort, { once: true });
        const timer = window.setTimeout(() => controller.abort(new DOMException('Text request timed out', 'TimeoutError')), TIMEOUT_MS);
        let reader;
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            if (!response.ok)
                throw new Error(`Failed to load ${url}: ${response.status}`);
            const declaredBytes = Number.parseInt(response.headers.get('Content-Length') || '', 10);
            const totalBytes = Number.isFinite(declaredBytes) && declaredBytes > 0 ? declaredBytes : 0;
            onProgress?.({ loadedBytes: 0, totalBytes, isIndeterminate: totalBytes === 0 });
            if (!response.body)
                return await response.text();
            reader = response.body.getReader();
            const decoder = new TextDecoder();
            const chunks = [];
            let loadedBytes = 0;
            while (true) {
                const result = await reader.read();
                if (result.done)
                    break;
                loadedBytes += result.value.byteLength;
                chunks.push(decoder.decode(result.value, { stream: true }));
                onProgress?.({ loadedBytes, totalBytes, isIndeterminate: totalBytes === 0 });
            }
            chunks.push(decoder.decode());
            return chunks.join('');
        }
        catch (error) {
            // 読み取りの失敗時に接続を残さない。キャンセルの完了待ちは復旧を遮らない。
            void reader?.cancel(error).catch(() => { });
            throw error;
        }
        finally {
            window.clearTimeout(timer);
            callerSignal?.removeEventListener('abort', forwardAbort);
            reader?.releaseLock();
        }
    }
    window.SiteTextLoader = { load, TIMEOUT_MS };
}());
