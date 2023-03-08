/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 977:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 522:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(977);
const github = __nccwpck_require__(522);

const context = github.context;

const getRepoTags = async () => {  
  const response = await octokit.rest.repos.listTags({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  console.log("Got tags", response);
  return response.data;
}

const getDefaultBaseReleaseTag = async (tags) => {  
  return tags[1].tag_name;
}

(async function() {
  try {
    const token = core.getInput('token');
    octokit = github.getOctokit(token);
    console.log("Initiated octokit");

    const repoTags = core.getInput('head-tag') || await getRepoTags()
    console.log("Repo tags: ", repoTags);

    // const baseReleaseTag = core.getInput('release-tag') || await getDefaultBaseReleaseTag();
    // console.log("Base release tag: ", baseReleaseTag);
    
    // const continueOnError = core.getInput('continue-on-error');
    
    // const response = await octokit.rest.repos.compareCommitsWithBasehead({
    //   owner: context.repo.owner,
    //   repo: context.repo.repo,
    //   basehead: `${baseReleaseTag}...${headReleaseTag}`,
    // });
    // const messages = (response.data.commits.map(c => c.commit.message) || []).join('');
    // const regex = /[A-Z]{2,}-\d+/g; 
    // const issueKeys = messages.match(regex);

    // if (!issueKeys || issueKeys.length == 0) {
    //   if (!continueOnError) {
    //     throw new Error("No issue keys found"); 
    //   }
    // }
    // core.setOutput('issue-keys', issueKeys.join(','));
  } catch (error) {
    if (!continueOnerror) {
     core.setFailed(error.message);
    } else {
     core.setOutput('issue-keys', ''); 
    }
  }
})()

})();

module.exports = __webpack_exports__;
/******/ })()
;