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
    page: currentPage++,
  });
  if (!response || !response.data) {
    return null;
  }
  var result = response.data;
  while (response && response.data && response.data.length == pageSize) {
    response = await octokit.rest.repos.listTags({
      owner: owner,
      repo: repo,
      per_page: pageSize,
      page: currentPage++,
    });
    result = result.concat(response.data);
  }
  return result;
};

const sortSemVer = (arr, reverse = false) => {
  // Pad each numeric segment to 8 digits for sorting, preserving leading zeros
  const padWidth = 8;
  let semVerArr = arr.map((i) =>
    i.replace(/(\d+)/g, (m) => m.padStart(padWidth, "0"))
  ).sort();
  if (reverse) {
    semVerArr = semVerArr.reverse();
  }
  // Remove padding after sorting, but preserve all original digits (including leading zeros)
  // To do this, keep a mapping from padded to an array of originals
  const originalMap = {};
  arr.forEach((orig) => {
    const padded = orig.replace(/(\d+)/g, (m) => m.padStart(padWidth, "0"));
    if (!originalMap[padded]) {
      originalMap[padded] = [];
    }
    originalMap[padded].push(orig);
  });
  return semVerArr.map((padded) =>
    (originalMap[padded] && originalMap[padded].shift()) || padded
  );
};

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
};

const extractCommitsBasedOnFilePath = async (
  commits,
  pathFilter,
  owner,
  repo,
) => {
  let includedCommits = [];
  let fileMatches = pathFilter.split(",");
  for (const commit of commits) {
    let response = await octokit.rest.repos.getCommit({
      owner: owner,
      repo: repo,
      ref: commit.sha,
    });
    let files = response.data.files;
    if (files.length == 0 && response.data.committer.type == "Bot") { //include bot commits for nojira commits
      includedCommits.push(commit);
      continue;
    }
    loopFiles:
    for (const file of files) {
      for (const fileMatch of fileMatches) {
        if (file.filename.startsWith(fileMatch)) {
          includedCommits.push(commit);
          break loopFiles;
        }
      }
    }
  }
  console.log(
    "includedCommitMessages",
    includedCommits.map((c) => c.commit.message),
  );
  return includedCommits ? includedCommits.map((c) => c.commit.message) : null;
};

const getBranchForHeadCommit = async (headReleaseTag, owner, repo) => {
  let response = await octokit.rest.repos.listBranchesForHeadCommit({
    owner,
    repo,
    commit_sha: headReleaseTag,
  });
  return response.data;
};

// --- Tests for sortSemVer ---
function testSortSemVer() {
  const tests = [
    {
      input: ["1.0.014", "1.0.015", "1.0.016"],
      expected: ["1.0.014", "1.0.015", "1.0.016"],
      desc: "Basic semver sort",
    },
    {
      input: ["1.2.3", "1.2.10", "1.2.2"],
      expected: ["1.2.2", "1.2.3", "1.2.10"],
      desc: "Basic semver sort",
    },
    {
      input: ["10.0.016", "10.0.2", "10.0.10"],
      expected: ["10.0.2", "10.0.10", "10.0.016"],
      desc: "Preserve leading zeros in last segment",
    },
    {
      input: ["2.1.030", "2.1.300", "2.1.003"],
      expected: ["2.1.003", "2.1.030", "2.1.300"],
      desc: "Leading zeros in first and middle segment",
    },
    {
      input: ["1.0.10", "1.0.2", "1.0.02"],
      expected: ["1.0.2", "1.0.02", "1.0.10"],
      desc: "Zeros in patch, mixed",
    },
    {
      input: ["1.0.10", "1.0.2", "1.0.02"],
      expected: ["1.0.10", "1.0.2", "1.0.02"],
      desc: "Reverse sort",
      reverse: true,
    },
  ];
  let allPassed = true;
  for (const t of tests) {
    const result = sortSemVer(t.input, t.reverse);
    const pass = JSON.stringify(result) === JSON.stringify(t.expected);
    if (!pass) allPassed = false;
    console.log(
      `Test: ${t.desc}\n  Input:    ${JSON.stringify(t.input)}\n  Expected: ${
        JSON.stringify(t.expected)
      }\n  Got:      ${JSON.stringify(result)}\n  Result:   ${
        pass ? "PASS" : "FAIL"
      }\n`,
    );
  }
  if (allPassed) {
    console.log("All sortSemVer tests passed!\n");
  } else {
    console.error("Some sortSemVer tests failed.\n");
  }
}

// --- Tests for findPreviousSemver ---
async function testFindPreviousSemver() {
  const tests = [
    {
      input: { current: "1.0.013", arr: ["1.0.011", "1.0.012", "1.0.013"] },
      expected: "1.0.012",
      desc: "Previous exists in sorted list with trailing zeroes",
    },
    {
      input: { current: "1.0.2", arr: ["1.0.1", "1.0.2", "1.0.3"] },
      expected: "1.0.1",
      desc: "Previous exists in sorted list",
    },
    {
      input: { current: "1.0.1", arr: ["1.0.1", "1.0.2", "1.0.3"] },
      expected: "1.0.1",
      desc: "First element returns itself",
    },
    {
      input: { current: "1.0.3", arr: ["1.0.1", "1.0.2", "1.0.3"] },
      expected: "1.0.2",
      desc: "Last element returns previous",
    },
    {
      input: { current: "1.0.10", arr: ["1.0.2", "1.0.10", "1.0.02"] },
      expected: "1.0.02",
      desc: "Handles leading zeros",
    },
    {
      input: { current: "1.0.02", arr: ["1.0.2", "1.0.10", "1.0.02"] },
      expected: "1.0.2",
      desc: "Handles leading zeros, previous is non-zero",
    },
    {
      input: { current: "1.0.1", arr: [] },
      expected: null,
      desc: "Empty array returns null",
    },
    {
      input: { current: "1.0.5", arr: ["1.0.1", "1.0.2", "1.0.3"] },
      expected: null,
      desc: "Current not in array returns null",
    },
  ];
  let allPassed = true;
  for (const t of tests) {
    const result = await findPreviousSemver(t.input.current, t.input.arr);
    const pass = result === t.expected;
    if (!pass) allPassed = false;
    console.log(
      `Test: ${t.desc}\n  Input:    current=${t.input.current}, arr=${
        JSON.stringify(t.input.arr)
      }\n  Expected: ${JSON.stringify(t.expected)}\n  Got:      ${
        JSON.stringify(result)
      }\n  Result:   ${pass ? "PASS" : "FAIL"}\n`,
    );
  }
  if (allPassed) {
    console.log("All findPreviousSemver tests passed!\n");
  } else {
    console.error("Some findPreviousSemver tests failed.\n");
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSortSemVer();
  testFindPreviousSemver();
}

const main = async (
  continueOnError,
  token,
  headReleaseTag,
  releaseTag,
  owner,
  repo,
  tagFilter,
  pathFilter,
) => {
  octokit = github.getOctokit(token, { owner: "", repo: "" });
  console.log("Initiated octokit");
  console.log("Head release tag: ", headReleaseTag);

  var repoTags = await getRepoTags(owner, repo);
  if (!repoTags || repoTags.length == 0) {
    if (!continueOnError) {
      throw new Error("No repo tags found");
    } else {
      console.warn("No repo tags found");
      return "";
    }
  }

  let tags = tagFilter
    ? repoTags.filter((c) => c.name.startsWith(tagFilter)).map((c) => c.name)
    : repoTags.map((c) => c.name);
  const baseReleaseTag = releaseTag ||
    await findPreviousSemver(headReleaseTag, tags);
  console.log("Previous release tag: ", baseReleaseTag);

  if (!baseReleaseTag) {
    if (!continueOnError) {
      throw new Error("Could not find previous release tag");
    } else {
      console.warn("Could not find previous release tag");
      return "";
    }
  }

  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: owner,
    repo: repo,
    basehead: `${baseReleaseTag}...${headReleaseTag}`,
  });
  let messages = pathFilter
    ? (await extractCommitsBasedOnFilePath(
      response.data.commits,
      pathFilter,
      owner,
      repo,
    ) || [""]).join("")
    : (response.data.commits.map((c) => c.commit.message) || [""]).join("");
  const branchHead = await getBranchForHeadCommit(
    response.data.commits[response.data.commits.length - 1].sha,
    owner,
    repo,
  );
  const branchHeadNames = branchHead.map((c) => c.name) || [""];
  messages += branchHeadNames.join("");

  const regex = /[A-Z]{2,}-\d+/g;
  let issueKeys = messages.match(regex);

  if (!issueKeys || issueKeys.length == 0) {
    if (!continueOnError) {
      throw new Error("No issue keys found");
    } else {
      console.warn("No issue keys found");
      return "";
    }
  }
  issueKeys = [...new Set(issueKeys)]; //remove duplicates
  console.log("Found the following issue-keys", issueKeys.join(","));
  let output = issueKeys.join(",");
  return output;
};

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
    let issueKeys = await main(
      continueOnError,
      token,
      headReleaseTag,
      baseReleaseTag,
      owner,
      repo,
      tagFilter,
      pathFilter,
    );
  } catch (error) {
    console.error(error.message, error);
  }
})();
