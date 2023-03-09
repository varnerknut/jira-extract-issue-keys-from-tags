const core = require("@actions/core");
const github = require("@actions/github");

const context = github.context;

const getRepoTags = async () => {
  const response = await octokit.rest.repos.listTags({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  return response.data;
};

const findPreviousSemver = async (semverString, semverStringArray) => {
  confole.log("findPreviousSemver", semverString, semverStringArray);
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
  try {
    const token = core.getInput("token");
    octokit = github.getOctokit(token);
    console.log("Initiated octokit");

    const headReleaseTag = core.getInput("head-tag");
    console.log("Head release tag: ", headReleaseTag);

    var repoTags = await getRepoTags();
    console.log("repoTags: ", repoTags);
    let tags = repoTags.map((c) => c.name);

    const baseReleaseTag = core.getInput("release-tag") || await findPreviousSemver(headReleaseTag, tags);
    console.log("Previous release tag: ", baseReleaseTag);

    const continueOnError = core.getInput("continue-on-error");

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
      core.setOutput("issue-keys", "");
    }
  }
})();
