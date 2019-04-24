export default function HttpTransport({url, method, headers, encode}) {
  if (!url) throw new Error('url must be specificed when using HttpTransport');
  if (!method) method = 'POST';
  if (!headers) headers = {};
  if (!encode) encode = payload => JSON.stringify(payload);

  // XMLHttpRequest is only used when Fetch API is not supported
  const sendUsingXMLHttpRequest = ({payload, onFailure}) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.keys(headers).forEach(key => {
      xhr.setRequestHeader(key, headers[key]);
    });
    xhr.onload = () => {
      if (xhr.status < 200 || status >= 300) {
        onFailure();
      }
    };
    xhr.onerror = () => onFailure();
    xhr.send(encode(payload));
  };

  /**
   * We prefer Fetch API beacuse it has `keepalive` flag. The keepalive option
   * can be used to allow the request to outlive the page. Fetch with the
   * keepalive flag is a replacement for the sendBeacon API.
   */
  const sendUsingFetchAPI = ({payload, onFailure}) => {
    window
      .fetch(url, {
        method,
        headers,
        keepalive: true,
        body: encode(payload)
      })
      .catch(() => onFailure());
  };

  this.process = window.fetch ? sendUsingFetchAPI : sendUsingXMLHttpRequest;
}
