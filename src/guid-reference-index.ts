// Reverse GUID index: which assets reference a given GUID.
// It replaces the previous "read every scene/prefab into memory and run
// includes(guid) over all of it" lookup with an O(1) map access.
// Free of "vscode" imports so it can be unit tested.

export class GuidReferenceIndex {
    private assetsByGuid = new Map<string, Set<string>>();
    private guidsByAsset = new Map<string, Set<string>>();

    /** Records the GUIDs referenced by an asset, replacing any previous entry. */
    public set(assetKey: string, guids: Iterable<string>): void {
        this.remove(assetKey);

        const owned = new Set<string>();
        for (const guid of guids) {
            owned.add(guid);

            let assets = this.assetsByGuid.get(guid);
            if (!assets) {
                assets = new Set<string>();
                this.assetsByGuid.set(guid, assets);
            }
            assets.add(assetKey);
        }

        this.guidsByAsset.set(assetKey, owned);
    }

    /** Drops every reference recorded for the asset. */
    public remove(assetKey: string): void {
        const guids = this.guidsByAsset.get(assetKey);
        if (!guids) {
            return;
        }

        for (const guid of guids) {
            const assets = this.assetsByGuid.get(guid);
            if (!assets) {
                continue;
            }

            assets.delete(assetKey);
            if (assets.size === 0) {
                this.assetsByGuid.delete(guid);
            }
        }

        this.guidsByAsset.delete(assetKey);
    }

    /** Assets referencing the GUID, in insertion order. */
    public getAssets(guid: string): string[] {
        const assets = this.assetsByGuid.get(guid);
        return assets ? [...assets] : [];
    }

    public clear(): void {
        this.assetsByGuid.clear();
        this.guidsByAsset.clear();
    }
}
