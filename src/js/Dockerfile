FROM arm32v7/node:12

WORKDIR /usr/src/app

# COPY package.json ./
# RUN ["npm", "--verbose", "install"]

# COPY index.js .
# COPY OneWheel.js .

COPY /srv/onewheel_relay/src/js/. .
RUN npm --verbose install

EXPOSE 3000

CMD ["node", "./index.js"]