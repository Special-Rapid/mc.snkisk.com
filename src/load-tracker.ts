(function () {
    type Task = SiteLoadTask & { status: 'pending' | 'complete' | 'failed' };

    function create(): SiteLoadTracker {
        const tasks = new Map<string, Task>();
        const listeners = new Set<(state: SiteLoadState) => void>();
        const clamp = (value: number) => Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
        function ensure(id: string, defaults?: SiteTaskDefaults): Task {
            let task = tasks.get(id);
            if (!task) {
                task = { id, kind: defaults?.kind || 'generic', label: defaults?.label || id, progress: 0,
                    loadedBytes: 0, totalBytes: 0, isComplete: false, isFailed: false, isIndeterminate: false, status: 'pending' };
                tasks.set(id, task);
            }
            return task;
        }
        function snapshot(): SiteLoadState {
            const values = [...tasks.values()];
            return {
                progress: values.length ? values.reduce((sum, task) => sum + task.progress, 0) / values.length : 1,
                isComplete: values.every(task => task.status !== 'pending'),
                tasks: values.map(({ status: _status, ...task }) => ({ ...task })),
            };
        }
        function notify() {
            const state = snapshot();
            // 購読の解除や別購読の追加が、同じ通知の配信順を変えない。
            [...listeners].forEach(listener => listener(state));
        }
        function settle(id: string, status: 'complete' | 'failed') {
            const task = ensure(id);
            if (task.status !== 'pending') return;
            task.status = status;
            task.progress = 1;
            task.isComplete = true;
            task.isFailed = status === 'failed';
            if (task.totalBytes > 0) task.loadedBytes = task.totalBytes;
            notify();
        }
        return {
            registerTask(id, defaults) { ensure(id, defaults); notify(); },
            updateTask(id, patch = {}) {
                const task = ensure(id, patch);
                if (task.status !== 'pending') return;
                if (patch.kind) task.kind = patch.kind;
                if (patch.label) task.label = patch.label;
                if (Number.isFinite(patch.loadedBytes)) task.loadedBytes = Math.max(patch.loadedBytes!, 0);
                if (Number.isFinite(patch.totalBytes)) task.totalBytes = Math.max(patch.totalBytes!, 0);
                if (typeof patch.isIndeterminate === 'boolean') task.isIndeterminate = patch.isIndeterminate;
                if (patch.isFailed) { settle(id, 'failed'); return; }
                if (patch.isComplete) { settle(id, 'complete'); return; }
                const progress = task.totalBytes > 0 ? task.loadedBytes / task.totalBytes : patch.progress ?? task.progress;
                task.progress = Math.max(task.progress, clamp(progress));
                notify();
            },
            completeTask(id) { settle(id, 'complete'); },
            failTask(id) { settle(id, 'failed'); },
            getProgress: snapshot,
            subscribe(listener) {
                listeners.add(listener);
                listener(snapshot());
                return () => { listeners.delete(listener); };
            },
        };
    }
    window.SiteLoadTracker = { create };
}());
