import {describe, expect, it} from "vitest";
import {pointInFrame, regionFromPoints, validFrameTime} from "./manual";
import {validVideoMetadata, validateVideoFile} from "./media";
describe("manual frame geometry and bounds", () => {
  it("normalizes against the actual frozen image rect for landscape and portrait", () => {
    expect(pointInFrame(250,150,{left:50,top:50,width:400,height:200})).toEqual({x:.5,y:.5});
    expect(pointInFrame(100,250,{left:50,top:50,width:100,height:400})).toEqual({x:.5,y:.5});
    expect(pointInFrame(20,40,{left:50,top:50,width:400,height:200})).toBeNull();
    expect(pointInFrame(1,1,{left:0,top:0,width:0,height:200})).toBeNull();
  });
  it("sorts opposite corners and rejects invalid or microscopic boxes", () => {
    expect(regionFromPoints({x:.8,y:.7},{x:.2,y:.1})).toEqual({x1:.2,y1:.1,x2:.8,y2:.7});
    for (const x of [NaN,Infinity,-1,2,.201]) expect(regionFromPoints({x:.2,y:.1},{x,y:.7})).toBeNull();
  });
  it("preserves subsecond timestamps and rejects invalid media", () => {
    expect(validFrameTime(1.234567,2000)).toBe(true);
    for (const t of [NaN,Infinity,-1,2.001]) expect(validFrameTime(t,2000)).toBe(false);
    expect(validVideoMetadata(640,360,30)).toBeNull();
    expect(validVideoMetadata(640,360,30.001)).toBe("too-long");
    for (const dims of [[0,360,2],[640,0,2],[640,360,Infinity],[640,360,0],[100000,100000,2]]) expect(validVideoMetadata(dims[0]!,dims[1]!,dims[2]!)).toBe("load-failed");
    expect(validateVideoFile(new Blob([], {type:"video/mp4"}))).toBe("load-failed");
    expect(validateVideoFile(new Blob(["x"],{type:"text/plain"}))).toBe("invalid-type");
  });
});
