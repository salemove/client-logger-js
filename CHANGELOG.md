# 0.2.0

## Breaking

Custom transports must now return a Promise from `process` which resolves or
rejects when the transport has delivered logs.

## Improvements

Publisher no longer piles up pending requests when a transport is struggling.
Now there is only one concurrent transport request.
