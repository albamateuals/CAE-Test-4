# GitHub Pages Deployment

This project is a static website. It does not need a backend server, build step, database, or local PDF/audio paths.

## 1. Upload the project to GitHub

1. Create a new GitHub repository.
2. Upload the contents of the `outputs` folder to the repository.
3. Make sure these files and folders are included at the published root:
   - `index.html`
   - `style.css`
   - `script.js`
   - `examData.js`
   - `audio/`
4. Keep the four audio files inside the `audio` folder. The Listening playlist uses URL-encoded relative paths such as `audio/C1%20Advanced%204%2C%20Test%203%2C%20Part%201.mp3`.

## 2. Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Open `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select the branch that contains the uploaded files, usually `main`.
6. Select the folder:
   - `/root` if you uploaded the contents of `outputs` directly into the repository root.
   - `/outputs` if you uploaded the whole project and kept the website files inside the `outputs` folder.
7. Click `Save`.

## 3. Folder To Publish

Publish the `outputs` folder.

For the simplest setup, upload the contents of `outputs` directly to the repository root and publish `/root`.

If you keep the full workspace in the repository, publish `/outputs`.

## 4. Final URL Format

GitHub Pages will give you a URL in this format:

```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

For example:

```text
https://yourname.github.io/cae-test-3/
```

The exam should open from `index.html` automatically.

## Deployment Checks

- All application paths are relative.
- Audio files are referenced from the relative `audio/` folder.
- Reading and Listening run fully in the browser.
- Scoring, highlighting, notes, reset, and navigation use browser storage only.
- No local computer paths, PDF paths, or server-only dependencies are required.
