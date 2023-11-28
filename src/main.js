const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function setTagMessage(tagMsg, tags, github, owner, repo, changelogStructure, tagName) {
    let latestTag;
    if (tagMsg.length === 0 && tags.data.length > 0) {
        try {
            latestTag = tags.data.shift();

            let changelog = await github.repos.compareCommits({
                owner,
                repo,
                base: latestTag.name,
                head: 'main',
            });
            const structure = changelogStructure || `**{{message}}** {{sha}})\n`;

            tagMsg = changelog.data.commits
                .map(commit =>
                    structure
                        .replace(/({{message}})|({{messageHeadline}})|({{author}})|({{sha}})/g, (match, message, messageHeadline, author, sha) => {
                            if (message) return commit.commit.message;
                            if (messageHeadline) return commit.commit.message.split('\n')[0];
                            if (author) return !commit.hasOwnProperty('author') || !commit.author.hasOwnProperty('login') ? '' : commit.author.login;
                            if (sha) return commit.sha
                        }))
                .join('\n')
        } catch (e) {
            core.warning('Failed to generate changelog from commits: ' + e.message + os.EOL);
            tagMsg = tagName
        }
    }
    return tagMsg;
}

async function getExistingTag(octokit, owner, repo) {
    let tags = { data: [] };
    try {
        tags = await octokit.repos.listTags({
            owner,
            repo,
            per_page: 100,
        })
    } catch (e) {
        core.info('No tags found');
    }
    return tags.data;
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

        // Get owner and repo from context of payload that triggered the action
        const { owner, repo } = github.context.repo;

        // // Check for existing tag
        let tags = await getExistingTag(octokit, owner, repo);
        core.info(tags);

        // const tagPrefix = core.getInput('tag_prefix', { required: false });
        // const tagSuffix = core.getInput('tag_suffix', { required: false });
        // const changelogStructure = core.getInput('changelog_structure', { required: false });

        // const getTagName = version => {
        //     return `${tagPrefix}${version}${tagSuffix}`
        // };

        // // Check for existance of tag and abort (short circuit) if it already exists.
        // for (let tag of tags.data) {
        //     if (tag.name === getTagName(version)) {
        //         core.warning(`"${tag.name.trim()}" tag already exists.` + os.EOL);
        //         core.setOutput('tagname', '');
        //         return
        //     }
        // }

        // // Create the new tag name
        // const tagName = getTagName(version);

        // let tagMsg = core.getInput('tag_message', { required: false }).trim();
        // tagMsg = await setTagMessage(tagMsg, tags, ocktokit, owner, repo, changelogStructure, tagName);

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
