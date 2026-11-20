import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { classify } from "./mock-ai.mjs"

const html = await readFile(new URL("./index.html", import.meta.url))

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  })
  response.end(JSON.stringify(body))
}

function isNonEmptyString(input) {
  return typeof input === "string" && input.trim() !== ""
}

function isTopicValid(input) {
  return ["delivery", "pricing", "other"].includes(input)
}

class InvalidInputError extends Error {
  constructor(message) {
    super(message)
    this.name = "InvalidInputError"
  }
}

class InvalidModelResponseError extends Error {
  constructor(message) {
    super(message)
    this.name = "InvalidModelResponseError"
  }
}

class ModelTimeoutExceededError extends Error {
  constructor(message) {
    super(message)
    this.name = "ModelTimeoutExceededError"
  }
}

async function handleTriage(request, response) {
  try {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    if (!chunks.length) {
      throw new InvalidInputError()
    }
    const { text } = JSON.parse(Buffer.concat(chunks).toString("utf8"))
    if (!isNonEmptyString(text)) {
      throw new InvalidInputError()
    }
    const abortController = new AbortController()
    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController.abort()
        reject(new ModelTimeoutExceededError())
      }, 300)
    })

    let result
    try {
      result = JSON.parse(
        await Promise.race([
          classify(text, { signal: abortController.signal }),
          timeout,
        ]),
      )

      if (!isTopicValid(result.topic) || !isNonEmptyString(result.draft)) {
        throw new InvalidModelResponseError()
      }
      return json(response, 200, { status: "ready", ...result })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return json(response, 400, { status: "invalid_input" })
    }
    if (
      error instanceof InvalidModelResponseError ||
      error instanceof ModelTimeoutExceededError
    ) {
      return json(response, 200, {
        status: "manual_review",
        topic: null,
        draft: null,
      })
    }
    throw error
  }
}

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    response.end(html)
    return
  }
  if (request.method !== "POST" || request.url !== "/api/triage") {
    return json(response, 404, { status: "not_found" })
  }
  try {
    await handleTriage(request, response)
  } catch {
    json(response, 500, { status: "server_error" })
  }
}).listen(Number(process.env.PORT || 3000), "127.0.0.1")
