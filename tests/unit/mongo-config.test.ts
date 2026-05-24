import { describe, expect, it } from "vitest";
import { getMongoConnectionState } from "../../packages/db/src/index.js";

describe("Mongo connection package", () => {
  it("reports a stable disconnected state before startup connects", () => {
    expect(getMongoConnectionState()).toBe("disconnected");
  });
});
