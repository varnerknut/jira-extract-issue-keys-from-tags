const core = require('@actions/core');
const github = require('@actions/github');

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
