import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ManualVideoPanel from "./ManualVideoPanel";
const clip = {url:"blob:clip",width:160,height:90,durationMs:2000,source:"upload" as const,mimeType:"video/webm",name:"test.webm"};
afterEach(() => {cleanup(); vi.restoreAllMocks();});
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,"toDataURL").mockReturnValue("data:image/jpeg;base64,frame");
});
function freeze() {
  const video = screen.getByLabelText("Local video playback");
  Object.defineProperties(video,{readyState:{value:2,configurable:true},videoWidth:{value:160,configurable:true},videoHeight:{value:90,configurable:true},currentTime:{value:1.234567,writable:true,configurable:true}});
  fireEvent.loadedData(video);
  fireEvent.click(screen.getByRole("button",{name:"Select current frame"}));
  return video;
}
it("requires an explicit region and meaning, preserves the frozen timestamp after seeking", () => {
  const next=vi.fn(); render(<ManualVideoPanel clip={clip} onContinue={next}/>);
  expect(screen.getByRole("button",{name:"Select current frame"})).toBeDisabled();
  const video=freeze();
  const confirm=screen.getByRole("button",{name:"Confirm object and choose intent"});
  expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText("My object or exact words"),{target:{value:"  My blue cup  "}});
  fireEvent.click(screen.getByRole("button",{name:"Confirm region"}));
  Object.defineProperty(video,"currentTime",{value:.4,configurable:true});fireEvent.seeked(video);
  fireEvent.click(confirm);
  expect(next).toHaveBeenCalledWith({origin:"manual",time:1.234567,box:{x1:.1,y1:.1,x2:.9,y2:.9},labelEn:"  My blue cup  ",labelTa:null,catalogId:null});
  fireEvent.change(screen.getByLabelText("Left"),{target:{value:20}});
  expect(confirm).toBeDisabled();
});
it("allows catalog meaning and resets approval when a new frame is selected", () => {
  const next=vi.fn();render(<ManualVideoPanel clip={clip} onContinue={next}/>);freeze();
  fireEvent.click(screen.getByRole("button",{name:"Confirm region"}));
  fireEvent.change(screen.getByLabelText("Reviewed catalog object"),{target:{value:"water"}});
  fireEvent.click(screen.getByRole("button",{name:"Confirm object and choose intent"}));
  expect(next.mock.calls[0]?.[0]).toMatchObject({catalogId:"water",origin:"manual"});
  fireEvent.click(screen.getByRole("button",{name:"Select current frame"}));
  expect(screen.getByRole("button",{name:"Confirm object and choose intent"})).toBeDisabled();
});
it("shows decoder errors and disables frame selection", () => {
  render(<ManualVideoPanel clip={clip} onContinue={vi.fn()}/>);
  fireEvent.error(screen.getByLabelText("Local video playback"));
  expect(screen.getByRole("alert")).toHaveTextContent(/could not decode/i);
  expect(screen.getByRole("button",{name:"Select current frame"})).toBeDisabled();
});
