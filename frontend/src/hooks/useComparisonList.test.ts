import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useComparisonList } from "./useComparisonList";

describe("useComparisonList", () => {
  it("starts empty when localStorage has nothing stored", () => {
    const { result } = renderHook(() => useComparisonList());
    expect(result.current.playerIds).toEqual([]);
  });

  it("adds a player and persists it to localStorage", () => {
    const { result } = renderHook(() => useComparisonList());
    act(() => result.current.add("p1"));
    expect(result.current.playerIds).toEqual(["p1"]);
    expect(JSON.parse(localStorage.getItem("tactical-scouting:comparison-list")!)).toEqual(["p1"]);
  });

  it("does not add a duplicate player", () => {
    const { result } = renderHook(() => useComparisonList());
    act(() => result.current.add("p1"));
    act(() => result.current.add("p1"));
    expect(result.current.playerIds).toEqual(["p1"]);
  });

  it("caps the list at 4 players", () => {
    const { result } = renderHook(() => useComparisonList());
    act(() => {
      result.current.add("p1");
      result.current.add("p2");
      result.current.add("p3");
      result.current.add("p4");
      result.current.add("p5");
    });
    expect(result.current.playerIds).toHaveLength(4);
    expect(result.current.isFull).toBe(true);
  });

  it("removes a player", () => {
    const { result } = renderHook(() => useComparisonList());
    act(() => result.current.add("p1"));
    act(() => result.current.remove("p1"));
    expect(result.current.playerIds).toEqual([]);
  });

  it("clears the whole list", () => {
    const { result } = renderHook(() => useComparisonList());
    act(() => {
      result.current.add("p1");
      result.current.add("p2");
      result.current.clear();
    });
    expect(result.current.playerIds).toEqual([]);
  });
});
