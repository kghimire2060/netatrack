import { prisma } from "@/lib/db";
import { guard, created, errorResponse, fail, limitByIp, parseBody } from "@/lib/api";
import { LIMITS } from "@/lib/rate-limit";
import { pollVoteSchema } from "@/lib/validation";

/** One vote per authenticated user per poll. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await limitByIp("pollvote", LIMITS.pollVote);
  if (limited) return limited;

  try {
    const actor = await guard("poll.vote");
    const { id } = await params;
    const { optionId } = await parseBody(req, pollVoteSchema);

    const poll = await prisma.poll.findUnique({
      where: { id },
      select: { id: true, status: true, startsAt: true, endsAt: true, options: { select: { id: true } } },
    });
    if (!poll) return fail("Poll not found", 404);
    if (poll.status !== "OPEN") return fail("This poll is not open", 400);

    const now = new Date();
    if (poll.startsAt && poll.startsAt > now) return fail("This poll has not opened yet", 400);
    if (poll.endsAt && poll.endsAt < now) return fail("This poll has closed", 400);
    if (!poll.options.some((option) => option.id === optionId)) {
      return fail("That option does not belong to this poll", 400);
    }

    const existing = await prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId: poll.id, userId: actor.userId } },
    });
    if (existing) return fail("You have already voted in this poll", 409);

    await prisma.pollVote.create({
      data: { pollId: poll.id, optionId, userId: actor.userId },
    });
    return created({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
