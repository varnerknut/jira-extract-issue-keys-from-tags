const github = require("@actions/github");
//Test by running the following command in the terminal:
//node test.js <token> <headReleaseTag> <owner> <repo> <tagFilter> <pathFilter>
//Example:
//node test.js ghp_1234567890abcdef1234567890abcdef WebApi_TEST_v1.16 myorg myrepo WebApi_TEST WebApi/src

const context = github.context;

const getRepoTags = async (owner, repo) => {
  let currentPage = 1;
  let pageSize = 30;
  let response = await octokit.rest.repos.listTags({
    owner: owner,
    repo: repo,
    per_page: pageSize, 
    page: currentPage++
  });
  if (!response || !response.data){
    return null; 
  }
  var result = response.data;  
  while (response && response.data && response.data.length == pageSize){
    response = await octokit.rest.repos.listTags({
      owner: owner,
      repo: repo,
      per_page: pageSize, 
      page: currentPage++
    });    
    result = result.concat(response.data)
  }
  return result;
};

const sortSemVer = (arr, reverse = false) => {
  let semVerArr = arr.map(i => i.replace(/(\d+)/g, m => +m + 100000)).sort(); // +m is just a short way of converting the match to int
  if (reverse)
      semVerArr = semVerArr.reverse();

  return semVerArr.map(i => i.replace(/(\d+)/g, m => +m - 100000))
}

const findPreviousSemver = async (semverString, semverStringArray) => {
  console.log("findPreviousSemver", semverString, semverStringArray);
  if (!semverStringArray.length) {
    return null;
  }

  const sortedSemvers = sortSemVer(semverStringArray);
  var indexOfCurrent = sortedSemvers.indexOf(semverString);
  if (indexOfCurrent > -1) {
    if (indexOfCurrent > 0) {
      return sortedSemvers[--indexOfCurrent];
    }
    return sortedSemvers[indexOfCurrent];
  }
  return null;
}

const extractCommitsBasedOnFilePath = async (commits, pathFilter, owner, repo) => {
  let includedCommits = [];
  let fileMatches = pathFilter.split(",");
  for (const commit of commits){    
    let response = await octokit.rest.repos.getCommit({
      owner: owner,
      repo: repo,
      ref: commit.sha
    });
    let files = response.data.files
    if (files.length == 0 && response.data.committer.type == "Bot"){ //include bot commits for nojira commits
      includedCommits.push(commit);
      continue;
    }
    loopFiles:
    for (const file of files){      
      for (const fileMatch of fileMatches){
        if (file.filename.startsWith(fileMatch)){
          includedCommits.push(commit);
          break loopFiles;
        }
      }
    }    
  };  
  console.log("includedCommits", includedCommits.map((c) => c.commit.message));
  return includedCommits ? includedCommits.map((c) => c.commit.message) : null;
}

const getBranchForHeadCommit = async (headReleaseTag, owner, repo) => {
  let response = await octokit.rest.repos.listBranchesForHeadCommit({
    owner,
    repo,
    commit_sha: headReleaseTag,
  });
  return response.data;
}

const main = async(continueOnError, token, headReleaseTag, releaseTag, owner, repo, tagFilter, pathFilter) => {
    octokit = github.getOctokit(token, { owner: "", repo: ""});
    console.log("Initiated octokit");    
    console.log("Head release tag: ", headReleaseTag);
  
    var repoTags = await getRepoTags(owner, repo);  
    if (!repoTags || repoTags.length == 0) {
      if (!continueOnError) {
        throw new Error("No repo tags found");
      }
      else{
        console.warn("No repo tags found");
        return "";
      }
    }    
    
    let tags = tagFilter ? repoTags.filter(c => c.name.startsWith(tagFilter)).map(c => c.name) : repoTags.map(c => c.name);
    const baseReleaseTag = releaseTag || await findPreviousSemver(headReleaseTag, tags);
    console.log("Previous release tag: ", baseReleaseTag);
  
    if (!baseReleaseTag) {
      if (!continueOnError) {
        throw new Error("Could not find previous release tag");
      }
      else{
        console.warn("Could not find previous release tag");
        return "";
      }
    }    

    const response = await octokit.rest.repos.compareCommitsWithBasehead({
      owner: owner,
      repo: repo,
      basehead: `${baseReleaseTag}...${headReleaseTag}`,
    });    
    let messages = pathFilter ? (await extractCommitsBasedOnFilePath(response.data.commits, pathFilter, owner, repo) || [""]).join("") : (response.data.commits.map((c) => c.commit.message) || [""]).join("");
    const branchHead = await getBranchForHeadCommit(response.data.commits[response.data.commits.length - 1].sha, owner, repo);
    const branchHeadNames = branchHead.map((c) => c.name) || [""]
    messages += branchHeadNames.join("");
    
    const regex = /[A-Z]{2,}-\d+/g;
    let issueKeys = messages.match(regex);
  
    if (!issueKeys || issueKeys.length == 0) {
      if (!continueOnError) {
        throw new Error("No issue keys found");
      }
      else{
        console.warn("No issue keys found");
        return ""
      }
    }    
    issueKeys = [...new Set(issueKeys)] //remove duplicates
    console.log("Found the following issue-keys", issueKeys.join(","));
    let output = issueKeys.join(",");
    return output;
  }
  

(async function () {
  const continueOnError = true;
  try {
    console.info("Starting");
    var args = process.argv.slice(2);
    const token = args[0];
    const headReleaseTag = args[1];
    const baseReleaseTag = null;
    const owner = args[2];
    const repo = args[3];
    const tagFilter = args[4];
    const pathFilter = args[5];
    let issueKeys = await main(continueOnError, token, headReleaseTag, baseReleaseTag, owner, repo, tagFilter, pathFilter);
  } catch (error) {    
    console.error(error.message, error);
  }
})();
