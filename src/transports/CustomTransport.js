export default function CustomTransport(processFn) {
  if (!processFn)
    throw new Error('processFn must be specificed when using CustomTransport');

  this.process = processFn;
}
