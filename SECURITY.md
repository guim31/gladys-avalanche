# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration handles:

- `/data/avalanche.json`: the last bulletin read for each followed massif (public data) and the address of
  its file. No personal data.
- The optional Météo-France API key, kept by Gladys as a secret field of the configuration. It is only sent
  to `public-api.meteofrance.fr`, in the `apikey` header, and never written to the logs nor to `/data`.
- Network: outgoing HTTPS only, to `files.data.gouv.fr` (and the object storage it redirects to) and,
  with a key, to `public-api.meteofrance.fr`. The container listens on no port.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the third-party services the integration talks to.
