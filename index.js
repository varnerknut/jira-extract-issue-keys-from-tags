const core = require("@actions/core");
const github = require("@actions/github");

const context = github.context;

const getRepoTags = async () => {
  let currentPage = 1;
  let response = await octokit.rest.repos.listTags({
    owner: context.repo.owner,
    repo: context.repo.repo,
    per_page: 10, 
    page: currentPage++
  });
  var result = response.data;
  while (response && response.data && response.data.length == 10){
    response = await octokit.rest.repos.listTags({
      owner: context.repo.owner,
      repo: context.repo.repo,
      per_page: 10, 
      page: currentPage++
    });
    result.push(response.data)
  }
  return result;
};

const findPreviousSemver = async (semverString, semverStringArray) => {
  console.log("findPreviousSemver", semverString, semverStringArray);
  if (!semverStringArray.length) {
    return null;
  }

  const sortedSemvers = semverStringArray.sort();
  var indexOfCurrent = sortedSemvers.indexOf(semverString);
  if (indexOfCurrent > -1) {
    if (indexOfCurrent > 0) {
      return sortedSemvers[--indexOfCurrent];
    }
    return sortedSemvers[indexOfCurrent];
  }
  return null;
}

(async function () {
  const continueOnError = core.getInput("continue-on-error");
  try {
    const token = core.getInput("token");
    octokit = github.getOctokit(token);
    console.log("Initiated octokit");

    const headReleaseTag = core.getInput("head-tag");
    console.log("Head release tag: ", headReleaseTag);

    var repoTags = await getRepoTags();    
    let tags = repoTags.map(c => c.name);

    const baseReleaseTag = core.getInput("release-tag") || await findPreviousSemver(headReleaseTag, tags);
    console.log("Previous release tag: ", baseReleaseTag);

    const response = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: context.repo.owner,
      repo: context.repo.repo,
      basehead: `${baseReleaseTag}...${headReleaseTag}`,
    });
    const messages = (
      response.data.commits.map((c) => c.commit.message) || []
    ).join("");
    const regex = /[A-Z]{2,}-\d+/g;
    const issueKeys = messages.match(regex);

    if (!issueKeys || issueKeys.length == 0) {
      if (!continueOnError) {
        throw new Error("No issue keys found");
      }
    }
    core.setOutput("issue-keys", issueKeys.join(","));
  } catch (error) {
    if (!continueOnError) {
      core.setFailed(error.message);
    } else {
      console.error(error.message)
      core.setOutput("issue-keys", "");
    }
  }
})();
