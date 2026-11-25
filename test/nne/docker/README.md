# Local Oracle NNE fixture

From the repository root, start Oracle Database Free and wait until the image health check passes.

```sh
docker compose -f test/nne/docker/compose.yaml up -d --wait
node --test test/nne/e2e.js
```

The listener is bound to `127.0.0.1:11521/FREEPDB1`. The test-only user is `nne_test` with password `NneTest9876`. It can read `SYS.NNE_TEST_SESSION_BANNERS` to inspect encryption and integrity for its current session.

The default server policy requires AES256 and SHA256 while allowing legacy NNE negotiation. Set `NNE_ORACLE_POLICY=strong` to also reject weak client negotiation, or `NNE_ORACLE_POLICY=plaintext` to reject both NNE services. Set `NNE_ORACLE_POLICY` on both the Compose and Node commands to start and test a nondefault policy. Set `NNE_ORACLE_PORT` on both commands to override the host port.

To test additional policies on a running fixture, update the server policy before opening new connections.

```sh
docker compose -f test/nne/docker/compose.yaml exec -T -e NNE_ORACLE_POLICY=plaintext \
  oracle /container-entrypoint-startdb.d/10-server-policy.sh
NNE_ORACLE_POLICY=plaintext node --test test/nne/e2e.js

docker compose -f test/nne/docker/compose.yaml exec -T -e NNE_ORACLE_POLICY=strong \
  oracle /container-entrypoint-startdb.d/10-server-policy.sh
NNE_ORACLE_POLICY=strong node --test test/nne/e2e.js
```

The in-place policy remains active until the next policy change or container restart. A restart reapplies the policy passed to Compose. To reset it without a restart, run the same `exec` command with `NNE_ORACLE_POLICY=required`.

Remove the test container and its database volume when finished.

```sh
docker compose -f test/nne/docker/compose.yaml down -v
```
