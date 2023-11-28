const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const getTagMessage = async (tags, octokit, owner, repo, version) => {
    if (tags.length > 0) {
        try {
            const latestTag = tags.shift();
            const changelog = await octokit.rest.repos.compareCommitsWithBasehead({
                owner,
                repo,
                basehead: `${latestTag.name}...master`,
            });
            return changelog.data.commits
                .map((commit) => `** ${commit.commit.message} **`)
                .join('\n');
        } catch (error) {
            core.warning(`Failed to generate changelog from commits: ${error}`);
            return version;
        }
    } else {
        return version;
    }
}

const createTagAndRef = async (octokit, owner, repo, version, tagMessage) => {
    const newTag = await octokit.rest.git.createTag({
        owner,
        repo,
        tag: version,
        message: tagMessage,
        object: process.env.GITHUB_SHA,
        type: 'commit',
    });
    core.info(`Created new tag: ${newTag.data.tag}`)

    const newRef = await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${newTag.data.tag}`,
        sha: newTag.data.sha,
    });
    core.info(`Created new reference ${newRef.data.ref} available at ${newRef.data.url}`)

    return newTag.data.tag;
}

const getExistingTags = async (octokit, owner, repo) => {
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

const loadPubspec = () => {
    const pkgfile = path.join(process.env.GITHUB_WORKSPACE, 'pubspec.yaml');
    if (!fs.existsSync(pkgfile)) {
        core.setFailed('pubspec.yaml does not exist');
        return;
    }
    let fileContents = fs.readFileSync(pkgfile, 'utf8');
    return yaml.load(fileContents);
}

const run = async () => {
    try {
        const pkg = loadPubspec();
        const version = pkg.version.split('\+')[0];
        core.info(`Detected version ${version} in pubspec.yaml`);

        const octokit = github.getOctokit(process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN)
        const { owner, repo } = github.context.repo;

        const tags = await getExistingTags(octokit, owner, repo);
        for (const tag of tags) {
            if (tag.name === version) {
                core.setFailed(`Version tag already exists in repo: ${version}`);
                return;
            }
        }

        const tagMessage = await getTagMessage(tags, octokit, owner, repo, version);
        const newTagName = await createTagAndRef(octokit, owner, repo, version, tagMessage);

        core.setOutput('tagname', newTagName);
    } catch (error) {
        core.setFailed(`Exception: ${error}`);
    }
}

run().then((_) => core.info('DONE'));
