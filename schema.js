const Joi= require('joi');

const listingSchema=Joi.object({
      listing:Joi.object({
            title:Joi.string().required(),
            description:Joi.string().required(),
            price:Joi.number().required().min(0),
            location:Joi.string().required(),
            country:Joi.string().required(),
            image:Joi.string()
      })
});

const reviewSchema=Joi.object({
      review:Joi.object({
            rating:Joi.number().min(1).max(5).required(),
            comment:Joi.string().required(),
      }).required()
});

module.exports = { listingSchema, reviewSchema };
