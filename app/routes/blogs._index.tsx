import {redirect} from 'react-router';
import {JOURNAL_BLOG_HANDLE} from '~/lib/sitemap';

/**
 * The store has one journal, so the Hydrogen skeleton's "Blogs" list (an
 * unstyled heading linking to the empty `news` blog) is replaced by a
 * permanent redirect to it.
 */
export function loader() {
  return redirect(`/blogs/${JOURNAL_BLOG_HANDLE}`, 301);
}
