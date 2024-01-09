/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import { SchemaFieldTypes, createCluster } from "redis";

(async () => {
    const cluster = createCluster({
        rootNodes: [
            {
                socket: {
                    port: 6379,
                },
            },
            {
                socket: {
                    port: 6380,
                },
            },
            {
                socket: {
                    port: 6381,
                },
            },
        ],
        defaults: {
            socket: {
                host: "127.0.0.1",
            },
        },
    });

    cluster.on("error", (err) => console.log("Redis Cluster Error", err));

    await cluster.connect();

    try {
        // Quick and dirty way to manage the index creation. so this test can be executed an unlimited amount of time
        const idx = await cluster.ft.info("idx:nosync");
        console.log(`index ${idx.indexName} exists and contains ${idx.numDocs} documents`);
    } catch (error) {
        await cluster.ft.create(
            "idx:nosync",
            {
                "$.key1": {
                    type: SchemaFieldTypes.NUMERIC,
                    AS: "key1",
                },
                "$.key2": {
                    type: SchemaFieldTypes.NUMERIC,
                    AS: "key2",
                },
            },
            {
                ON: "JSON",
                PREFIX: "collection:name:",
            },
        );
    }

    await cluster.json.SET("collection:name:1", "$", { key1: 1, key2: 1 });
    await cluster.json.SET("collection:name:2", "$", { key1: 2, key2: 1 });
    await cluster.json.SET("collection:name:3", "$", { key1: 3, key2: 1 });
    await cluster.json.SET("collection:name:4", "$", { key1: 4, key2: 1 });

    await cluster.json.SET("collection:name:5", "$", { key1: 5, key2: 2 });
    await cluster.json.SET("collection:name:6", "$", { key1: 6, key2: 2 });
    await cluster.json.SET("collection:name:7", "$", { key1: 7, key2: 2 });
    await cluster.json.SET("collection:name:8", "$", { key1: 8, key2: 2 });

    const value = await cluster.ft.search("idx:nosync", "@key2:[2 2]");
    console.log(value);

    if (value.total !== 4) {
        console.log("test failed. result should contain 4 documents.");
    }

    /*
    // Another test forcing every node to answer however as seen in the output when uncommenting, other nodes answer with ErrorReply: MOVED 1672.
    console.log(``);
    for (const nodeShard of cluster.masters) {
        const client = await cluster.nodeClient(nodeShard);
        console.log(`answer from node : ${(await client.clientInfo()).addr}`);
        const value = await client.ft.search("idx:nosync", "@key2:[2 2]").catch((error) => console.log(error));
        if (value) {
            console.log(value);
        }
        console.log(``);
    }*/

    cluster.disconnect();
})();
