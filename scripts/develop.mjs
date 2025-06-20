import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";

const cwds = {
  "browser-sdk": "packages/browser-sdk",
  "react-sdk": "packages/react-sdk",
};

// usage: node scripts/develop.js browser-sdk react-sdk
const packagesToWatch = ["browser-sdk", "react-sdk"];

function createBuildProcess(cwd = "packages/browser-sdk") {
  const builder = spawn("yarn", ["build"], { cwd, stdio: "inherit" });

  // on build, we push to yalc
  builder.on("exit", code => {
    if (code === 0) {
      console.log(`[${cwd}] Build completed successfully, pushing to yalc...`);
      spawn("yalc", ["push"], { cwd, stdio: "inherit" });

      if (cwd === "packages/browser-sdk") {
        // now build react-sdk as it depends on browser-sdk
        createBuildProcess("packages/react-sdk");
      }
    } else {
      console.log(`[${cwd}] Build failed with code ${code}, skipping yalc push`);
    }
  });
  return builder;
}

const buildProcesses = {};
const chokidarSrcProcesses = {};

for (const pkg of packagesToWatch) {
  const cwd = cwds[pkg] || pkg;

  // start initial builds (not for react-sdk as it depends on browser-sdk)
  if (pkg === "browser-sdk") {
    buildProcesses[pkg] = createBuildProcess(cwd);
  }

  // Watch the dist folder and push to yalc when files change
  console.log(`[${pkg}] Watching src folder...`);
  const srcPath = path.resolve(cwd, "src");
  chokidarSrcProcesses[pkg] = chokidar
    .watch(srcPath, {
      ignored: /node_modules/,
      ignoreInitial: true,
      persistent: true,
    })
    .on("change", () => {
      console.log(`[${pkg}] Source files changed, rebuilding...`);

      // Kill existing build process if it's still running
      if (buildProcesses[pkg] && !buildProcesses[pkg].killed) {
        buildProcesses[pkg].kill();
      }
      buildProcesses[pkg] = createBuildProcess(cwd);
    });
}

process.on("SIGINT", () => {
  Object.values(buildProcesses).forEach(proc => proc.kill());
  Object.values(chokidarSrcProcesses).forEach(proc => proc.close());
  process.exit();
});
