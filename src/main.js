const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function getTagMessage(tags, octokit, owner, repo, version) {
    if (tags.length > 0) {
        try {
            const latestTag = tags.shift();
            const changelog = await octokit.rest.repos.compareCommitsWithBasehead({
                owner,
                repo,
                // basehead: `${latestTag.name}..master`,
                basehead: `3.0.3..master`,
            });
            core.info(changelog.data.commits);
            return changelog.data.commits
                .map((commit) => commit.commit.message)
                .join('\n');
        } catch (error) {
            core.warning(`Failed to generate changelog from commits: ${error}`);
            return version;
        }
    } else {
        return version;
    }
}

async function getExistingTags(octokit, owner, repo) {
    try {
        const tags = await octokit.rest.repos.listTags({
            owner,
            repo,
        });
        return tags.data;
    } catch (error) {
        core.info(`No tags found in repo: ${error}`);
        return [];
    }
}

function loadPubspec() {
    const pkg_root = core.getInput('package_root', { required: false });
    const pkgfile = path.join(process.env.GITHUB_WORKSPACE, pkg_root, 'pubspec.yaml');
    if (!fs.existsSync(pkgfile)) {
        core.setFailed('pubspec.yaml does not exist');
        return;
    }
    let fileContents = fs.readFileSync(pkgfile, 'utf8');
    return yaml.load(fileContents);
}

async function run() {
    try {
        const pkg = loadPubspec();
        const version = pkg.version.split('\+')[0];

        core.info(`Detected version ${version} in pubspec.yaml`);

        const octokit = github.getOctokit(process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN)
        const { owner, repo } = github.context.repo;

        const tags = await getExistingTags(octokit, owner, repo);
        core.info(tags.map((tag) => tag.name));

        for (const tag of tags) {
            if (tag.name === version) {
                core.setFailed(`Version tag already exists in repo: ${version}`);
                return;
            }
        }

        const tagMsg = await getTagMessage(tags, octokit, owner, repo, version);
        core.info(tagMsg);

        // let newTag;
        // try {
        //     tagMsg = tagMsg.trim().length > 0 ? tagMsg : `Version ${version}`;

        //     newTag = await github.git.createTag({
        //         owner,
        //         repo,
        //         tag: tagName,
        //         message: tagMsg,
        //         object: process.env.GITHUB_SHA,
        //         type: 'commit'
        //     });

        //     core.info(`Created new tag: ${newTag.data.tag}`)
        // } catch (e) {
        //     core.setFailed(e.message);
        //     return
        // }

        // let newReference;
        // try {
        //     newReference = await github.git.createRef({
        //         owner,
        //         repo,
        //         ref: `refs/tags/${newTag.data.tag}`,
        //         sha: newTag.data.sha,
        //     });

        //     core.info(`Reference ${newReference.data.ref} available at ${newReference.data.url}`)
        // } catch (e) {
        //     core.warning({
        //         owner,
        //         repo,
        //         ref: `refs/tags/${newTag.data.tag}`,
        //         sha: newTag.data.sha,
        //     });

        //     core.setFailed(e.message);
        //     return
        // }

        // // Store values for other actions
        // if (typeof newTag === 'object' && typeof newReference === 'object') {
        //     core.setOutput('tagname', tagName);

        // }
    } catch (error) {
        core.setFailed(`Exception: ${error}`);
    }
}

run().then((_) => core.debug('DONE'));
