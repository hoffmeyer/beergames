# Beerlympiad app

I want to create a web app to support some fun activities for a bachelor party.
The activities include three different types of games.

1 Kubb
2 Flunkyball
3 Tug of War

A tournament plan has been created and documented in tournament-schedule.md

# Requirements

- It should be possible to create and manage teams
- A team will have a number that is unique. Starting with 1 and incrementing by 1 for each new team.
- A team will also have a name and a color. These can be changed after the team is created.
- The tournament plan will be created by the app and will be used to determine the order of play
- The tournament plan will adhere to the rules mentioned in tournament-schedule.md
- The should be easily deployable to cloudflare
- After each match, the results should be recorded and the tournament plan should be updated accordingly
- It should have a live updated leaderboard
- It needs to work well on mobile devices
- The app should be in english

# Methodology

1) We need to determine the tech stack, I am familiar with React SPA applications, but I am open to other options. And this one will also need a backend to store the data.
2) I would prefer to avoid complicated authentication and authorization, for starters everything should be simple and easy to use. We might need to hide the scoring of  matches behind a password, to prevent cheating. The password can be hardcoded or stored in an environment variable.
3) If there are any questions or concerns, during analysis or development, ask the user for clarification.
