import { describe, test } from "node:test"
import assert from "node:assert"

describe("/api/triage", () => {
  test("when user enters [bad-topic], returns manual-review", async () => {
    const input = "[bad-topic]"
    const expectedResult = {
      status: "manual_review",
      topic: null,
      draft: null,
    }

    const response = await fetch("http://localhost:3000/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input,
      }),
    })
    const status = response.status
    const json = await response.json()

    assert.equal(status, 200)
    assert.deepEqual(json, expectedResult)
  })
})
