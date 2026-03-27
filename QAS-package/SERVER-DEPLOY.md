# QAS Deploy Package

## Structure
- QAS/ - main project
- video-pipeline/
- cursor-skills/ - copy to ~/.cursor/skills/
- config-templates/

## Deploy (Linux)
1. cd QAS/h5-video-tool-api && npm install && npm run build && cp .env.template .env
2. cd ../h5-video-tool && npm install && npm run build
3. pm2 start QAS/h5-video-tool-api/dist/index.js --name qas-api
4. pm2 serve QAS/h5-video-tool/dist 5173 --name qas-h5

See QAS/docs/deploy-ssh.md for details.
