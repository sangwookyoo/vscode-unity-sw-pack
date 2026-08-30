import * as assert from "assert";

import { PerformanceRule, findPerformanceIssues, findUnityMessageBodies } from "../../unity-performance";
import { SNIPPET_PREFIXES } from "../../snippet-catalog";

function rules(source: string): PerformanceRule[] {
    return findPerformanceIssues(source, SNIPPET_PREFIXES).map((finding) => finding.rule);
}

/** Asserts every reported offset still points at the text it claims. */
function assertOffsetsLineUp(source: string): void {
    for (const finding of findPerformanceIssues(source, SNIPPET_PREFIXES)) {
        assert.strictEqual(
            source.substr(finding.index, finding.length),
            finding.text,
            `offset for ${finding.rule} does not point at ${finding.text}`
        );
    }
}

function inUpdate(body: string): string {
    return `public class C : MonoBehaviour {\n    void Update() {\n${body}\n    }\n}`;
}

suite("Unity callback bodies", () => {
    test("finds a callback body and knows it is empty", () => {
        const bodies = findUnityMessageBodies("class C { void Update() { } }", ["Update"]);
        assert.strictEqual(bodies.length, 1);
        assert.strictEqual(bodies[0].empty, true);
    });

    test("a body with a statement is not empty", () => {
        const bodies = findUnityMessageBodies("class C { void Update() { Move(); } }", ["Update"]);
        assert.strictEqual(bodies[0].empty, false);
    });

    test("a body holding only a comment counts as empty", () => {
        const bodies = findUnityMessageBodies("class C { void Update() { // later\n } }", ["Update"]);
        assert.strictEqual(bodies[0].empty, true);
    });

    test("nested braces do not end the body early", () => {
        const source = "class C { void Update() { if (x) { A(); } B(); } void Other() { } }";
        const bodies = findUnityMessageBodies(source, ["Update"]);
        assert.strictEqual(bodies.length, 1);
        assert.ok(source.slice(bodies[0].start, bodies[0].end).includes("B();"));
    });

    test("only the requested callbacks are returned", () => {
        const source = "class C { void Update() { } void Helper() { } void Start() { } }";
        const names = findUnityMessageBodies(source, ["Update", "Start"]).map((body) => body.name);
        assert.deepStrictEqual(names, ["Update", "Start"]);
    });

    // The scan resumes on the closing brace of the previous body, because the
    // pattern needs it as the anchor for whatever is declared next.
    test("two callbacks in a row are both found", () => {
        const source = "class C { void Update() { A(); } void LateUpdate() { } }";
        const bodies = findUnityMessageBodies(source, ["Update", "LateUpdate"]);
        assert.deepStrictEqual(
            bodies.map((body) => body.name),
            ["Update", "LateUpdate"]
        );
        assert.strictEqual(bodies[1].empty, true);
    });

    test("an empty callback right after a full one is still reported", () => {
        const source = "class C : MonoBehaviour { void Update() { A(); } void LateUpdate() { } }";
        assert.deepStrictEqual(rules(source), ["empty-message"]);
    });

    test("coroutines are recognised as bodies too", () => {
        const bodies = findUnityMessageBodies("class C { IEnumerator Start() { yield return null; } }", ["Start"]);
        assert.strictEqual(bodies.length, 1);
    });
});

suite("empty callback rule", () => {
    test("reports an empty Unity callback", () => {
        assert.deepStrictEqual(rules("class C : MonoBehaviour { void Update() { } }"), ["empty-message"]);
    });

    test("says nothing about an empty ordinary method", () => {
        assert.deepStrictEqual(rules("class C : MonoBehaviour { void Helper() { } }"), []);
    });

    test("says nothing about a callback that does something", () => {
        assert.deepStrictEqual(rules("class C : MonoBehaviour { void Update() { Move(); } }"), []);
    });
});

suite("per-frame rules", () => {
    test("Camera.main inside Update", () => {
        assert.ok(rules(inUpdate("        var c = Camera.main;")).includes("camera-main"));
    });

    test("Camera.main outside a per-frame callback is left alone", () => {
        const source = "class C : MonoBehaviour { void Awake() { var c = Camera.main; } }";
        assert.ok(!rules(source).includes("camera-main"));
    });

    test("the scene search family", () => {
        assert.ok(rules(inUpdate('        GameObject.Find("Player");')).includes("find-object"));
        assert.ok(rules(inUpdate("        FindObjectOfType<Rigidbody>();")).includes("find-object"));
        assert.ok(rules(inUpdate("        Object.FindObjectsOfType<Light>();")).includes("find-object"));
        assert.ok(rules(inUpdate("        FindFirstObjectByType<Camera>();")).includes("find-object"));
    });

    test("GetComponent inside Update", () => {
        assert.ok(rules(inUpdate("        GetComponent<Rigidbody>().Move();")).includes("get-component"));
        assert.ok(rules(inUpdate("        GetComponentInChildren<Light>();")).includes("get-component"));
    });

    test("GetComponent in Awake is the recommended place, so it is not reported", () => {
        const source = "class C : MonoBehaviour { void Awake() { GetComponent<Rigidbody>(); } }";
        assert.ok(!rules(source).includes("get-component"));
    });

    test("SendMessage anywhere in a per-frame callback", () => {
        assert.ok(rules(inUpdate('        target.SendMessage("Hit");')).includes("send-message"));
        assert.ok(rules(inUpdate('        target.BroadcastMessage("Hit");')).includes("send-message"));
    });

    test("Debug.Log inside Update", () => {
        assert.ok(rules(inUpdate('        Debug.Log("tick");')).includes("debug-log"));
        assert.ok(rules(inUpdate('        Debug.LogWarning("tick");')).includes("debug-log"));
    });

    test("OnGUI and FixedUpdate count as per-frame", () => {
        assert.ok(rules("class C : MonoBehaviour { void OnGUI() { var c = Camera.main; } }").includes("camera-main"));
        assert.ok(
            rules("class C : MonoBehaviour { void FixedUpdate() { var c = Camera.main; } }").includes("camera-main")
        );
    });
});

suite("tag comparison rule", () => {
    test("reports == and != against a string", () => {
        assert.ok(rules(inUpdate('        if (other.tag == "Player") { }')).includes("tag-comparison"));
        assert.ok(rules(inUpdate('        if (other.tag != "Player") { }')).includes("tag-comparison"));
    });

    test("applies outside a per-frame callback as well", () => {
        const source = 'class C : MonoBehaviour { void OnTriggerEnter(Collider o) { if (o.tag == "P") { } } }';
        assert.ok(rules(source).includes("tag-comparison"));
    });

    test("CompareTag is the fix, so it is not reported", () => {
        assert.ok(!rules(inUpdate('        if (other.CompareTag("Player")) { }')).includes("tag-comparison"));
    });
});

suite("allocation in a loop", () => {
    test("reports a yield instruction created per iteration", () => {
        const source = `class C : MonoBehaviour {
    IEnumerator Run() {
        while (true) {
            yield return new WaitForSeconds(1f);
        }
    }
}`;
        assert.ok(rules(source).includes("allocation-in-loop"));
    });

    test("says nothing when it is created once outside the loop", () => {
        const source = `class C : MonoBehaviour {
    IEnumerator Run() {
        var wait = new WaitForSeconds(1f);
        while (true) {
            yield return wait;
        }
    }
}`;
        assert.ok(!rules(source).includes("allocation-in-loop"));
    });
});

// The analyser is syntactic, so masking is what keeps it from reporting text
// that only looks like code.
suite("comments and strings are not code", () => {
    test("a call inside a comment is ignored", () => {
        // The body has to do something, otherwise it is an empty callback and
        // the empty-message rule fires — correctly, but not what is under test.
        assert.deepStrictEqual(rules(inUpdate("        Move(); // Camera.main is slow")), []);
        assert.deepStrictEqual(rules(inUpdate('        Move(); /* GameObject.Find("x") */')), []);
    });

    test("a call inside a string literal is ignored", () => {
        assert.deepStrictEqual(rules(inUpdate('        var s = "Camera.main";')), []);
        assert.deepStrictEqual(rules(inUpdate('        var s = @"GameObject.Find";')), []);
    });

    test("reported offsets point at the real text", () => {
        assertOffsetsLineUp(
            inUpdate(`        var c = Camera.main;
        GameObject.Find("Player");
        GetComponent<Rigidbody>();
        Debug.Log("tick");
        if (other.tag == "Player") { }`)
        );
    });

    test("a file with nothing to say produces nothing", () => {
        const source = `using UnityEngine;

public class Clean : MonoBehaviour
{
    private Rigidbody body;

    void Awake()
    {
        body = GetComponent<Rigidbody>();
    }

    void Update()
    {
        body.AddForce(Vector3.up);
    }
}`;
        assert.deepStrictEqual(rules(source), []);
    });
});
