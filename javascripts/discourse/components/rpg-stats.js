import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import { inject as service } from "@ember/service";

export default class UserStats extends Component {
  @service site;
  @service currentUser;
  @tracked userSummary = null;
  @tracked maxPostCount = 0;
  @tracked maxLikesReceived = 0;
  @tracked maxTimeRead = 0;
  @tracked maxDaysVisited = 0;
  @tracked maxLikesPerPost = 0;
  @tracked maxTopicsEntered = 0;
  @tracked minLikesGiven = 0;
  @tracked totalTopics = 0;
  @tracked loading = true;

  constructor() {
    super(...arguments);
    this.totalTopics = this.site.categories.reduce(
      (sum, category) => sum + category.topic_count,
      0
    );
    this.fetchSummary();
    this.fetchDirectory();
  }

  @action
  fetchSummary() {
    this.args.user
      .summary()
      .then((summary) => {
        this.userSummary = summary;
      })
      .catch((error) => {
        console.error("Error getting user summary: ", error);
      });
  }

  async fetchDirectory() {
    this.loading = true;
    try {
      const directory = await ajax(
        `/directory_items.json?period=all&order=likes_received`,
        {}
      );

      this.maxLikesPerPost = directory.directory_items.reduce((max, user) => {
        let likesPerPost = user.likes_received / (user.post_count || 1);
        return Math.max(max, likesPerPost);
      }, 0);

      this.maxTopicsEntered = directory.directory_items.reduce(
        (max, user) => Math.max(max, user.topics_entered),
        0
      );
      this.maxLikesReceived = directory.directory_items.reduce(
        (max, user) => Math.max(max, user.likes_received),
        0
      );
      this.minLikesGiven = directory.directory_items.reduce(
        (min, user) => Math.min(min, user.likes_given),
        Infinity
      );

      this.maxPostCount = Math.max(
        ...directory.directory_items.map((user) => user.post_count)
      );

      this.maxTimeRead = Math.max(
        ...directory.directory_items.map((user) => user.time_read)
      );

      console.log(this.site);

      this.maxDaysVisited = Math.max(
        ...directory.directory_items.map((user) => user.days_visited)
      );
    } catch (error) {
      console.error("Error fetching directory:", error);
    } finally {
      this.loading = false;
    }
  }

  get normalizedPostCount() {
    return this.userSummary
      ? Math.floor((this.userSummary.post_count / this.maxPostCount) * 100)
      : 0;
  }

  get normalizedLikesReceived() {
    if (!this.userSummary || this.userSummary.post_count === 0) return 0;

    let likesPerPost =
      this.userSummary.likes_received / this.userSummary.post_count;

    return Math.floor((likesPerPost / this.maxLikesPerPost) * 100);
  }

  get normalizedTimeRead() {
    return this.userSummary
      ? Math.floor((this.userSummary.time_read / this.maxTimeRead) * 100)
      : 0;
  }

  get normalizedDaysVisited() {
    return this.userSummary
      ? Math.floor((this.userSummary.days_visited / this.maxDaysVisited) * 100)
      : 0;
  }

  get normalizedWisdom() {
    if (!this.userSummary || !this.totalTopics) return 0;
    let topicsEntered = Math.min(
      this.userSummary.topics_entered,
      this.totalTopics
    );
    return Math.floor((topicsEntered / this.totalTopics) * 100);
  }

  get normalizedLuck() {
    if (!this.userSummary || this.userSummary.likes_given === 0) return 0;

    let luck = this.userSummary.likes_received / this.userSummary.likes_given;
    let maxLuck = this.maxLikesReceived / (this.minLikesGiven || 1); // avoid division by zero

    return Math.floor((luck / maxLuck) * 100);
  }

  get userLevel() {
    const trust = this.args.user.trust_level;

    if (this.args.user.admin) return "Boss";

    if (this.args.user.moderator) return "Mini-boss";

    if (trust === 4) return "Leader";
    if (trust === 3) return "Regular";
    if (trust === 2) return "Member";
    if (trust === 1) return "Basic";
    if (trust === 0) return "Noob";
  }
}
