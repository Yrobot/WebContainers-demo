import { WebContainer, FileNode } from "@webcontainer/api";
import { files } from "./files";

let webcontainerInstance: WebContainer;

const iframeEl = document.querySelector("iframe") as HTMLIFrameElement;

const textareaEl = document.querySelector("textarea") as HTMLTextAreaElement;

window.addEventListener("load", async () => {
  textareaEl.value = (files["index.js"] as FileNode).file.contents as string;
  textareaEl.addEventListener("input", (e) => {
    writeIndexJS((e.currentTarget as HTMLTextAreaElement).value);
  });

  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  const exitCode = await installDependencies();
  if (exitCode !== 0) {
    throw new Error("Installation failed");
  }

  startDevServer();
});

async function installDependencies() {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn("npm", ["install"]);
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log(data);
      },
    })
  );
  // Wait for install command to exit
  return installProcess.exit;
}

async function startDevServer() {
  // Run `npm run start` to start the Express app
  await webcontainerInstance.spawn("npm", ["run", "start"]);

  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    iframeEl.src = url;
  });

  webcontainerInstance.on("error", console.error);
}

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}
