fkomp@fkomp-2189:~/.config/opencode$ # Test 5.2.2: nomnom (soorte de gemini scrap search crawl integrée direct dans pollinations )avec demande tooling
opencode run "météo à paris" -m "pollinations/enter/nomnom"
echo "test 5.2.2 au dessus"
INFO  2026-01-26T04:56:36 +96ms service=models.dev file={} refreshing
^C^
test 5.2.2 au dessus
fkomp@fkomp-2189:~/.config/opencode$ opencode run "météo à paris" -m "pollinations/enter/nomnom" --print-logs
INFO  2026-01-26T04:59:51 +97ms service=models.dev file={} refreshing
INFO  2026-01-26T04:59:51 +495ms service=default version=1.1.36 args=["run","météo à paris","-m","pollinations/enter/nomnom","--print-logs"] opencode
INFO  2026-01-26T04:59:51 +2ms service=default directory=/home/fkomp/.config/opencode creating instance
INFO  2026-01-26T04:59:51 +0ms service=project directory=/home/fkomp/.config/opencode fromDirectory
INFO  2026-01-26T04:59:51 +17ms service=default directory=/home/fkomp/.config/opencode bootstrapping
INFO  2026-01-26T04:59:51 +18ms service=config path=/home/fkomp/.config/opencode/config.json loading
INFO  2026-01-26T04:59:51 +1ms service=config path=/home/fkomp/.config/opencode/opencode.json loading
INFO  2026-01-26T04:59:51 +53ms service=config path=/home/fkomp/.config/opencode/opencode.jsonc loading
INFO  2026-01-26T04:59:51 +6ms service=config path=/home/fkomp/.config/opencode/opencode.json loading
INFO  2026-01-26T04:59:51 +19ms service=bun cmd=["/home/fkomp/.opencode/bin/opencode","add","@opencode-ai/plugin@1.1.36","--exact"] cwd=/home/fkomp/.config/opencode running
INFO  2026-01-26T04:59:51 +6ms service=config path=/home/fkomp/.opencode/opencode.jsonc loading
INFO  2026-01-26T04:59:51 +1ms service=config path=/home/fkomp/.opencode/opencode.json loading
INFO  2026-01-26T04:59:51 +0ms service=bun cmd=["/home/fkomp/.opencode/bin/opencode","add","@opencode-ai/plugin@1.1.36","--exact"] cwd=/home/fkomp/.opencode running
INFO  2026-01-26T04:59:51 +19ms service=plugin name=CodexAuthPlugin loading internal plugin
INFO  2026-01-26T04:59:51 +1ms service=plugin name=CopilotAuthPlugin loading internal plugin
INFO  2026-01-26T04:59:51 +1ms service=plugin path=opencode-antigravity-auth@beta loading plugin
INFO  2026-01-26T04:59:51 +3ms service=bun code=0 stdout=bun add v1.3.5 (1e86cebd)

installed @opencode-ai/plugin@1.1.36

[4.00ms] done
 stderr=Saved lockfile
 done
INFO  2026-01-26T04:59:51 +0ms service=bun cmd=["/home/fkomp/.opencode/bin/opencode","install"] cwd=/home/fkomp/.opencode running
INFO  2026-01-26T04:59:51 +221ms service=plugin path=file:///home/fkomp/.config/opencode/plugins/pollinations.js loading plugin
INFO  2026-01-26T04:59:52 +159ms service=bun code=0 stdout=bun add v1.3.5 (1e86cebd)

+ opencode-pollinations-plugin@opencode-pollinations-plugin-0.1.0.tgz

installed @opencode-ai/plugin@1.1.36

2 packages installed [27.00ms]
 stderr=Saved lockfile
 done
INFO  2026-01-26T04:59:52 +3ms service=bun cmd=["/home/fkomp/.opencode/bin/opencode","install"] cwd=/home/fkomp/.config/opencode running
INFO  2026-01-26T04:59:52 +6ms service=bun code=0 stdout=bun install v1.3.5 (1e86cebd)

Checked 3 installs across 4 packages (no changes) [3.00ms]
 stderr= done
INFO  2026-01-26T04:59:52 +2ms service=plugin path=opencode-anthropic-auth@0.0.9 loading plugin
INFO  2026-01-26T04:59:52 +10ms service=plugin path=@gitlab/opencode-gitlab-auth@1.3.2 loading plugin
INFO  2026-01-26T04:59:52 +131ms service=bun code=0 stdout=bun install v1.3.5 (1e86cebd)

+ opencode-pollinations-plugin@opencode-pollinations-plugin-0.1.0.tgz

2 packages installed [20.00ms]
 stderr= done
INFO  2026-01-26T04:59:52 +624ms service=bus type=* subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=session.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=message.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=message.part.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=session.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=message.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=message.part.updated subscribing
INFO  2026-01-26T04:59:52 +0ms service=bus type=session.diff subscribing
INFO  2026-01-26T04:59:52 +1ms service=format init
INFO  2026-01-26T04:59:52 +0ms service=bus type=file.edited subscribing
INFO  2026-01-26T04:59:52 +1ms service=lsp serverIds=deno, typescript, vue, eslint, oxlint, biome, gopls, ruby-lsp, pyright, elixir-ls, zls, csharp, fsharp, sourcekit-lsp, rust, clangd, svelte, astro, jdtls, kotlin-ls, yaml-ls, lua-ls, php intelephense, prisma, dart, ocaml-lsp, bash, terraform, texlab, dockerfile, gleam, clojure-lsp, nixd, tinymist, haskell-language-server enabled LSP servers
INFO  2026-01-26T04:59:52 +6ms service=scheduler id=snapshot.cleanup run
INFO  2026-01-26T04:59:52 +1ms service=scheduler id=tool.truncation.cleanup run
INFO  2026-01-26T04:59:52 +4ms service=bus type=command.executed subscribing
INFO  2026-01-26T04:59:52 +50ms service=server method=POST path=/session request
INFO  2026-01-26T04:59:52 +0ms service=server status=started method=POST path=/session request
INFO  2026-01-26T04:59:52 +6ms service=session id=ses_40753ceeaffeHu1ISPh7kDXuQn slug=happy-tiger version=1.1.36 projectID=global directory=/home/fkomp/.config/opencode title=New session - 2026-01-26T04:59:52.981Z time={"created":1769403592981,"updated":1769403592981} created
INFO  2026-01-26T04:59:52 +2ms service=bus type=session.created publishing
INFO  2026-01-26T04:59:52 +1ms service=bus type=session.updated publishing
INFO  2026-01-26T04:59:52 +4ms service=server status=completed duration=13 method=POST path=/session request
INFO  2026-01-26T04:59:52 +1ms service=server method=GET path=/config request
INFO  2026-01-26T04:59:52 +0ms service=server status=started method=GET path=/config request
INFO  2026-01-26T04:59:52 +1ms service=server status=completed duration=1 method=GET path=/config request
INFO  2026-01-26T04:59:52 +4ms service=server method=GET path=/event request
INFO  2026-01-26T04:59:52 +0ms service=server status=started method=GET path=/event request
INFO  2026-01-26T04:59:52 +2ms service=server method=POST path=/session/ses_40753ceeaffeHu1ISPh7kDXuQn/message request
INFO  2026-01-26T04:59:52 +0ms service=server status=started method=POST path=/session/ses_40753ceeaffeHu1ISPh7kDXuQn/message request
INFO  2026-01-26T04:59:52 +1ms service=server event connected
INFO  2026-01-26T04:59:53 +5ms service=bus type=* subscribing
INFO  2026-01-26T04:59:53 +9ms service=server status=completed duration=17 method=GET path=/event request
INFO  2026-01-26T04:59:53 +3ms service=server status=completed duration=18 method=POST path=/session/ses_40753ceeaffeHu1ISPh7kDXuQn/message request
INFO  2026-01-26T04:59:53 +36ms service=bus type=message.updated publishing
INFO  2026-01-26T04:59:53 +13ms service=provider status=started state
INFO  2026-01-26T04:59:53 +11ms service=bus type=message.part.updated publishing
INFO  2026-01-26T04:59:53 +37ms service=provider init
INFO  2026-01-26T04:59:53 +3ms service=bus type=session.updated publishing
INFO  2026-01-26T04:59:53 +8ms service=bus type=session.status publishing
INFO  2026-01-26T04:59:53 +0ms service=session.prompt step=0 sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn loop
INFO  2026-01-26T04:59:53 +22ms service=server status=started method=POST path=/log request
INFO  2026-01-26T04:59:53 +9ms service=provider providerID=openai found
INFO  2026-01-26T04:59:53 +0ms service=provider providerID=oracle found
INFO  2026-01-26T04:59:53 +0ms service=provider providerID=pollinations_enter found
INFO  2026-01-26T04:59:53 +0ms service=provider providerID=mistral found
INFO  2026-01-26T04:59:53 +0ms service=provider providerID=google found
INFO  2026-01-26T04:59:53 +0ms service=provider providerID=opencode found
INFO  2026-01-26T04:59:53 +1ms service=provider providerID=pollinations found
INFO  2026-01-26T04:59:53 +0ms service=provider status=completed duration=92 state
INFO  2026-01-26T04:59:53 +5ms service=bus type=message.updated publishing
INFO  2026-01-26T04:59:53 +1ms service=session.prompt status=started resolveTools
ERROR 2026-01-26T04:59:53 +2ms service=default e=ProviderModelNotFoundError rejection
INFO  2026-01-26T04:59:53 +5ms service=tool.registry status=started invalid
INFO  2026-01-26T04:59:53 +1ms service=tool.registry status=started question
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started bash
INFO  2026-01-26T04:59:53 +1ms service=bash-tool shell=/usr/bin/bash bash tool using shell
INFO  2026-01-26T04:59:53 +1ms service=tool.registry status=started read
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started glob
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started grep
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started edit
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started write
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started task
INFO  2026-01-26T04:59:53 +1ms service=tool.registry status=started webfetch
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started todowrite
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started todoread
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=started skill
INFO  2026-01-26T04:59:53 +2ms service=tool.registry status=started google_search
INFO  2026-01-26T04:59:53 +1ms service=tool.registry status=completed duration=7 invalid
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=6 question
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=4 read
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=4 glob
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=4 grep
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=4 edit
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=4 write
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=3 webfetch
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=3 todowrite
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=3 todoread
INFO  2026-01-26T04:59:53 +1ms service=tool.registry status=completed duration=2 google_search
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=7 bash
INFO  2026-01-26T04:59:53 +1ms service=permission permission=task pattern=general ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T04:59:53 +0ms service=permission permission=task pattern=explore ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T04:59:53 +0ms service=tool.registry status=completed duration=6 task
INFO  2026-01-26T04:59:53 +2ms service=tool.registry status=completed duration=6 skill
INFO  2026-01-26T04:59:53 +14ms service=mcp key=gencodedoc type=local found
INFO  2026-01-26T04:59:53 +23ms service=mcp key=github type=local found
INFO  2026-01-26T04:59:53 +4ms service=mcp key=orchestrator type=local found
INFO  2026-01-26T04:59:53 +5ms service=mcp key=searxng_remote type=local found
INFO  2026-01-26T04:59:53 +10ms service=mcp key=deepsearch type=local found
INFO  2026-01-26T04:59:53 +6ms service=mcp key=vision_expert type=local found
INFO  2026-01-26T04:59:53 +12ms service=mcp key=mcp_studio type=local found
INFO  2026-01-26T04:59:53 +28ms service=mcp key=multi-db-mcp-server type=local found
INFO  2026-01-26T04:59:53 +17ms service=mcp key=task-todo type=local found
INFO  2026-01-26T04:59:53 +24ms service=mcp key=timeout_tester type=local found
INFO  2026-01-26T04:59:53 +29ms service=mcp key=context7 type=local found
INFO  2026-01-26T04:59:54 +1112ms service=mcp key=searxng_remote toolCount=3 create() successfully created client
INFO  2026-01-26T04:59:54 +236ms service=mcp key=timeout_tester toolCount=1 create() successfully created client
INFO  2026-01-26T04:59:54 +189ms service=mcp key=deepsearch toolCount=11 create() successfully created client
INFO  2026-01-26T04:59:54 +33ms service=mcp key=orchestrator mcp stderr: ✅ McpServer importé
✅ StdioServerTransport importé
✅ zod importé
✅ queue importé
✅ servers importé
✅ sftp importé

INFO  2026-01-26T04:59:54 +3ms service=mcp key=orchestrator mcp stderr: ✅ ssh importé
✅ history importé
✅ config importé
✅ apis importé
=== TOUS LES IMPORTS RÉUSSIS ===
⏳ Initialisation de la queue...

INFO  2026-01-26T04:59:54 +50ms service=mcp key=orchestrator mcp stderr: [ℹ️  INFO] 04:59:54 - 7 tâches restaurées depuis la sauvegarde
✅ Queue initialisée

INFO  2026-01-26T04:59:55 +54ms service=mcp key=orchestrator mcp stderr: ✅ Serveur MCP créé

INFO  2026-01-26T04:59:55 +15ms service=mcp key=orchestrator mcp stderr: ✅ Serveur MCP créé

INFO  2026-01-26T04:59:55 +58ms service=mcp key=multi-db-mcp-server mcp stderr: {"level":"info","message":"Starting MCP Database Server","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.094Z"}

INFO  2026-01-26T04:59:55 +7ms service=mcp key=multi-db-mcp-server mcp stderr: {"DATABASE_CONNECTIONS":"not set","DATABASE_CONNECTIONS_FILE":"/home/fkomp/Bureau/oracle/tools/mcp-database-server-node/config/databases.json","level":"info","message":"Building database configurations","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.107Z"}

INFO  2026-01-26T04:59:55 +2ms service=mcp key=multi-db-mcp-server mcp stderr: {"level":"info","message":"Attempting to load connections from file: /home/fkomp/Bureau/oracle/tools/mcp-database-server-node/config/databases.json","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.108Z"}

INFO  2026-01-26T04:59:55 +23ms service=mcp key=multi-db-mcp-server mcp stderr: {"connectionNames":["rag_db","gemini_agent_db","multi_cc_up","tasks_db"],"level":"info","message":"Loaded 4 database connections from file: /home/fkomp/Bureau/oracle/tools/mcp-database-server-node/config/databases.json","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.132Z"}

INFO  2026-01-26T04:59:55 +12ms service=mcp key=multi-db-mcp-server mcp stderr: {"databaseCount":4,"databaseNames":["rag_db","gemini_agent_db","multi_cc_up","tasks_db"],"level":"info","message":"Configuration loaded successfully","serverPort":8000,"service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.136Z"}
{"configurations":["rag_db","gemini_agent_db","multi_cc_up","tasks_db"],"level":"info","message":"Initializing database connections","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.137Z","totalConfigurations":4}

INFO  2026-01-26T04:59:55 +14ms service=mcp key=orchestrator mcp stderr: 🔌 Connexion du transport stdio...

INFO  2026-01-26T04:59:55 +14ms service=mcp key=orchestrator mcp stderr: 🚀 Serveur connecté et prêt !

INFO  2026-01-26T04:59:55 +30ms service=mcp key=multi-db-mcp-server mcp stderr: {"connectionTime":"2026-01-26T04:59:55.201Z","database":"tasks_db","level":"info","message":"Database connected","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.202Z","type":"sqlite"}

INFO  2026-01-26T04:59:55 +4ms service=mcp key=multi-db-mcp-server mcp stderr: {"database":"tasks_db","level":"info","message":"SQLite connection established","path":"/home/fkomp/Bureau/oracle/tools/mcp-task-todo/data/tasks.db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.205Z"}

INFO  2026-01-26T04:59:55 +5ms service=mcp key=multi-db-mcp-server mcp stderr: {"level":"info","message":"Database driver created and connected","name":"tasks_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.207Z","type":"sqlite"}
{"level":"info","message":"Database connection added successfully","name":"tasks_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.209Z","type":"sqlite"}

INFO  2026-01-26T04:59:55 +100ms service=mcp key=mcp_studio toolCount=21 create() successfully created client
INFO  2026-01-26T04:59:55 +5ms service=mcp key=orchestrator toolCount=27 create() successfully created client
INFO  2026-01-26T04:59:55 +96ms service=mcp key=multi-db-mcp-server mcp stderr: {"connectionTime":"2026-01-26T04:59:55.409Z","database":"multi_cc_up","level":"info","message":"Database connected","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.410Z","type":"postgresql"}

INFO  2026-01-26T04:59:55 +1ms service=mcp key=multi-db-mcp-server mcp stderr: {"database":"multi_cc_up","databaseName":"multi_cc_up","host":"localhost","level":"info","message":"PostgreSQL connection established","port":5432,"service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.411Z"}
{"level":"info","message":"Database driver created and connected","name":"multi_cc_up","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.411Z","type":"postgresql"}
{"level":"info","message":"Database connection added successfully","name":"multi_cc_up","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.411Z","type":"postgresql"}

INFO  2026-01-26T04:59:55 +22ms service=mcp key=multi-db-mcp-server mcp stderr: {"connectionTime":"2026-01-26T04:59:55.426Z","database":"rag_db","level":"info","message":"Database connected","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.426Z","type":"postgresql"}

INFO  2026-01-26T04:59:55 +9ms service=mcp key=multi-db-mcp-server mcp stderr: {"database":"rag_db","databaseName":"rag_db","host":"localhost","level":"info","message":"PostgreSQL connection established","port":5432,"service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.438Z"}
{"level":"info","message":"Database driver created and connected","name":"rag_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.439Z","type":"postgresql"}
{"level":"info","message":"Database connection added successfully","name":"rag_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.439Z","type":"postgresql"}
{"connectionTime":"2026-01-26T04:59:55.442Z","database":"gemini_agent_db","level":"info","message":"Database connected","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.442Z","type":"postgresql"}
{"database":"gemini_agent_db","databaseName":"gemini_agent_db","host":"localhost","level":"info","message":"PostgreSQL connection established","port":5432,"service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.442Z"}
{"level":"info","message":"Database driver created and connected","name":"gemini_agent_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.442Z","type":"postgresql"}
{"level":"info","message":"Database connection added successfully","name":"gemini_agent_db","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.442Z","type":"postgresql"}

INFO  2026-01-26T04:59:55 +1ms service=mcp key=multi-db-mcp-server mcp stderr: {"activeConnections":4,"failedConnections":0,"level":"info","message":"Database connections initialization completed","service":"mcp-database-server","successfulConnections":4,"timestamp":"2026-01-26T04:59:55.443Z","totalConfigurations":4}
{"level":"info","message":"MCP Database Server started successfully","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.443Z"}

INFO  2026-01-26T04:59:55 +19ms service=mcp key=multi-db-mcp-server mcp stderr: {"clientInfo":{"name":"opencode","version":"1.1.36"},"level":"info","message":"MCP client initialized","service":"mcp-database-server","timestamp":"2026-01-26T04:59:55.454Z"}

INFO  2026-01-26T04:59:55 +17ms service=mcp key=multi-db-mcp-server toolCount=4 create() successfully created client
INFO  2026-01-26T04:59:55 +136ms service=mcp key=task-todo mcp stderr: ✅ MCP ULTIMATE v3.1 (Fixes Applied) READY
🌍 Ligne Téléphonique ouverte sur : POST http://localhost:3000/line/:slug

INFO  2026-01-26T04:59:55 +12ms service=mcp key=vision_expert toolCount=4 create() successfully created client
INFO  2026-01-26T04:59:55 +24ms service=mcp key=task-todo toolCount=35 create() successfully created client
INFO  2026-01-26T04:59:56 +572ms service=mcp key=gencodedoc mcp stderr: 🔍 SnapshotStore DEBUG:
  - storage_path: /home/fkomp/Bureau/oracle/utilitaires/gencodedoc/gencodedoc/.gencodedoc
  - project_path: /home/fkomp/Bureau/oracle/utilitaires/gencodedoc/gencodedoc

INFO  2026-01-26T04:59:56 +1ms service=mcp key=gencodedoc mcp stderr:   - DB: /home/fkomp/Bureau/oracle/utilitaires/gencodedoc/gencodedoc/.gencodedoc/gencodedoc.db

INFO  2026-01-26T04:59:56 +3ms service=mcp key=gencodedoc toolCount=18 create() successfully created client
INFO  2026-01-26T04:59:57 +1660ms service=mcp key=context7 mcp stderr: WARNING: Using default CLIENT_IP_ENCRYPTION_KEY.

INFO  2026-01-26T04:59:58 +246ms service=mcp key=context7 mcp stderr: Context7 Documentation MCP Server v2.1.0 running on stdio

INFO  2026-01-26T04:59:58 +36ms service=mcp key=context7 toolCount=2 create() successfully created client
INFO  2026-01-26T04:59:58 +670ms service=mcp key=github mcp stderr: GitHub MCP Server running on stdio

INFO  2026-01-26T04:59:58 +27ms service=mcp key=github toolCount=26 create() successfully created client
INFO  2026-01-26T04:59:58 +36ms service=session.prompt status=completed duration=5744 resolveTools
INFO  2026-01-26T04:59:58 +6ms service=bus type=message.updated publishing
ERROR 2026-01-26T04:59:58 +2ms service=default e=ProviderModelNotFoundError rejection
INFO  2026-01-26T04:59:58 +0ms service=bus type=session.updated publishing
INFO  2026-01-26T04:59:58 +2ms service=bus type=session.diff publishing
INFO  2026-01-26T04:59:58 +15ms service=session.processor process
INFO  2026-01-26T04:59:58 +3ms service=llm providerID=pollinations modelID=enter/nomnom sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn small=false agent=build mode=primary stream
INFO  2026-01-26T04:59:58 +2ms service=provider status=started providerID=pollinations getSDK
INFO  2026-01-26T04:59:58 +0ms service=provider providerID=pollinations pkg=@ai-sdk/openai-compatible using bundled provider
INFO  2026-01-26T04:59:58 +0ms service=provider status=completed duration=0 providerID=pollinations getSDK
INFO  2026-01-26T04:59:58 +24ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:11 +12325ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:11 +6ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:11 +1ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:11 +11ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:11 +1ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:11 +0ms service=session.prompt step=1 sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn loop
INFO  2026-01-26T05:00:11 +3ms service=bus type=message.updated publishing
ERROR 2026-01-26T05:00:11 +1ms service=default e=ProviderModelNotFoundError rejection
INFO  2026-01-26T05:00:11 +1ms service=bus type=session.updated publishing
INFO  2026-01-26T05:00:11 +0ms service=bus type=session.diff publishing
INFO  2026-01-26T05:00:11 +2ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:11 +0ms service=session.prompt status=started resolveTools
INFO  2026-01-26T05:00:11 +1ms service=tool.registry status=started invalid
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started question
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started bash
INFO  2026-01-26T05:00:11 +0ms service=bash-tool shell=/usr/bin/bash bash tool using shell
INFO  2026-01-26T05:00:11 +1ms service=tool.registry status=started read
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started glob
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started grep
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started edit
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started write
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started task
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started webfetch
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started todowrite
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started todoread
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=started skill
INFO  2026-01-26T05:00:11 +1ms service=tool.registry status=started google_search
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=2 invalid
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=2 question
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 read
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 glob
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 grep
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 edit
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 write
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 webfetch
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 todowrite
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=1 todoread
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=0 google_search
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=2 bash
INFO  2026-01-26T05:00:11 +1ms service=tool.registry status=completed duration=2 skill
INFO  2026-01-26T05:00:11 +0ms service=permission permission=task pattern=general ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:11 +0ms service=permission permission=task pattern=explore ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:11 +0ms service=tool.registry status=completed duration=2 task
INFO  2026-01-26T05:00:11 +47ms service=session.prompt status=completed duration=51 resolveTools
INFO  2026-01-26T05:00:11 +2ms service=session.processor process
INFO  2026-01-26T05:00:11 +0ms service=llm providerID=pollinations modelID=enter/nomnom sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn small=false agent=build mode=primary stream
INFO  2026-01-26T05:00:11 +7ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:12 +1060ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:12 +2ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:12 +1ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:12 +3ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:12 +0ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:12 +0ms service=session.prompt step=2 sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn loop
INFO  2026-01-26T05:00:12 +6ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:12 +1ms service=bus type=session.updated publishing
INFO  2026-01-26T05:00:12 +2ms service=bus type=session.diff publishing
ERROR 2026-01-26T05:00:12 +1ms service=default e=ProviderModelNotFoundError rejection
INFO  2026-01-26T05:00:12 +8ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:12 +10ms service=session.prompt status=started resolveTools
INFO  2026-01-26T05:00:12 +2ms service=tool.registry status=started invalid
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started question
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started bash
INFO  2026-01-26T05:00:12 +0ms service=bash-tool shell=/usr/bin/bash bash tool using shell
INFO  2026-01-26T05:00:12 +1ms service=tool.registry status=started read
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started glob
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started grep
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started edit
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started write
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started task
INFO  2026-01-26T05:00:12 +1ms service=tool.registry status=started webfetch
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started todowrite
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started todoread
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started skill
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=started google_search
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=2 invalid
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=2 question
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=1 read
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=1 glob
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=1 grep
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=1 edit
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=1 write
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=0 webfetch
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=0 todowrite
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=0 todoread
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=0 google_search
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=2 bash
INFO  2026-01-26T05:00:12 +1ms service=tool.registry status=completed duration=1 skill
INFO  2026-01-26T05:00:12 +0ms service=permission permission=task pattern=general ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:12 +0ms service=permission permission=task pattern=explore ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:12 +0ms service=tool.registry status=completed duration=2 task
INFO  2026-01-26T05:00:12 +43ms service=session.prompt status=completed duration=48 resolveTools
INFO  2026-01-26T05:00:12 +2ms service=session.processor process
INFO  2026-01-26T05:00:12 +0ms service=llm providerID=pollinations modelID=enter/nomnom sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn small=false agent=build mode=primary stream
INFO  2026-01-26T05:00:12 +9ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:13 +996ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:13 +2ms service=bus type=message.part.updated publishing
INFO  2026-01-26T05:00:13 +1ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:13 +2ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:13 +1ms service=bus type=session.status publishing
INFO  2026-01-26T05:00:13 +0ms service=session.prompt step=3 sessionID=ses_40753ceeaffeHu1ISPh7kDXuQn loop
INFO  2026-01-26T05:00:13 +5ms service=bus type=message.updated publishing
ERROR 2026-01-26T05:00:13 +1ms service=default e=ProviderModelNotFoundError rejection
INFO  2026-01-26T05:00:13 +1ms service=bus type=session.updated publishing
INFO  2026-01-26T05:00:13 +1ms service=bus type=session.diff publishing
INFO  2026-01-26T05:00:13 +11ms service=bus type=message.updated publishing
INFO  2026-01-26T05:00:13 +0ms service=session.prompt status=started resolveTools
INFO  2026-01-26T05:00:13 +1ms service=tool.registry status=started invalid
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started question
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started bash
INFO  2026-01-26T05:00:13 +0ms service=bash-tool shell=/usr/bin/bash bash tool using shell
INFO  2026-01-26T05:00:13 +1ms service=tool.registry status=started read
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started glob
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started grep
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started edit
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started write
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started task
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started webfetch
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started todowrite
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started todoread
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started skill
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=started google_search
INFO  2026-01-26T05:00:13 +1ms service=tool.registry status=completed duration=2 invalid
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=2 question
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 read
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 glob
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 grep
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 edit
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 write
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 webfetch
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 todowrite
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 todoread
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=1 google_search
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=2 bash
INFO  2026-01-26T05:00:13 +1ms service=tool.registry status=completed duration=2 skill
INFO  2026-01-26T05:00:13 +0ms service=permission permission=task pattern=general ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:13 +0ms service=permission permission=task pattern=explore ruleset=[{"permission":"*","action":"allow","pattern":"*"},{"permission":"doom_loop","action":"ask","pattern":"*"},{"permission":"external_directory","pattern":"*","action":"ask"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"},{"permission":"question","action":"deny","pattern":"*"},{"permission":"plan_enter","action":"deny","pattern":"*"},{"permission":"plan_exit","action":"deny","pattern":"*"},{"permission":"read","pattern":"*","action":"allow"},{"permission":"read","pattern":"*.env","action":"ask"},{"permission":"read","pattern":"*.env.*","action":"ask"},{"permission":"read","pattern":"*.env.example","action":"allow"},{"permission":"question","action":"allow","pattern":"*"},{"permission":"plan_enter","action":"allow","pattern":"*"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output","action":"allow"},{"permission":"external_directory","pattern":"/home/fkomp/.local/share/opencode/tool-output/*","action":"allow"}] evaluate
INFO  2026-01-26T05:00:13 +0ms service=tool.registry status=completed duration=2 task
INFO  2026-01-26T05:00:13 +37ms service=session.prompt status=completed duration=41 resolveTools
INFO  2026-01-26T05:00:13 +5ms service=session.processor process
BUG BOUCLE uniquement pour nomnom, tous le reste est rétablit
