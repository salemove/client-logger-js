export default function Breadcrumbs() {
  this.list = [];
  this.add = crumb => {
    if (this.list.length === 10) {
      this.list = this.list.slice(1);
    }
    this.list.push(crumb);
  };
}
